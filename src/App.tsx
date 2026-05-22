import { FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, functions, storage } from "./lib/firebase";
import logoUrl from "../assets/app/logo.png";
import presentationVideoUrl from "../assets/app/presentation.mp4";

const SUPER_ADMIN_EMAIL = "chaobatido.paiveio@gmail.com";
const MAX_IMAGE_BYTES = 1_200_000;
const MAX_VIDEO_INPUT_BYTES = 75_000_000;
const MAX_VIDEO_SECONDS = 90;

type Status = "draft" | "published";
type CollectionName = "publications" | "events" | "initiatives" | "team" | "stories";
type MediaType = "image" | "video";
type StoryBlockType = "text" | "image";

type MediaItem = {
  url: string;
  type: MediaType;
  path: string;
  name: string;
  size: number;
  order: number;
};

type ContentBase = {
  id: string;
  status: Status;
  description?: string;
  date?: string;
  time?: string;
  address?: string;
  media?: MediaItem[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type Publication = ContentBase;
type EventItem = ContentBase;

type Initiative = ContentBase & {
  days?: string[];
  schedule?: string;
  teamIds?: string[];
  noticeTitle?: string;
  noticeText?: string;
  noticeExpiresAt?: string;
};

type TeamMember = ContentBase & {
  name?: string;
  graduation?: string;
  age?: number;
  history?: string;
  photo?: MediaItem | null;
};

type StoryBlock = {
  id: string;
  type: StoryBlockType;
  text?: string;
  media?: MediaItem;
};

type Story = ContentBase & {
  title?: string;
  blocks?: StoryBlock[];
};

type AnyContent = Publication | EventItem | Initiative | TeamMember | Story;

type SectionConfig = {
  collectionName: CollectionName;
  label: string;
  path: string;
  singular: string;
  kind: "publication" | "event" | "initiative" | "team" | "story";
};

const sections: SectionConfig[] = [
  { collectionName: "publications", label: "Publicações", path: "/", singular: "Publicação", kind: "publication" },
  { collectionName: "events", label: "Eventos", path: "/eventos", singular: "Evento", kind: "event" },
  { collectionName: "initiatives", label: "Iniciativas", path: "/iniciativas", singular: "Iniciativa", kind: "initiative" },
  { collectionName: "team", label: "Equipe", path: "/equipe", singular: "Membro", kind: "team" },
  { collectionName: "stories", label: "História", path: "/historia", singular: "História", kind: "story" },
];

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function emptyForm(kind: SectionConfig["kind"]) {
  if (kind === "story") {
    return {
      status: "draft" as Status,
      title: "",
      blocks: [{ id: crypto.randomUUID(), type: "text" as StoryBlockType, text: "" }],
    };
  }
  if (kind === "team") {
    return { status: "draft" as Status, name: "", graduation: "", age: "", history: "" };
  }
  if (kind === "initiative") {
    return {
      status: "draft" as Status,
      description: "",
      address: "",
      days: [] as string[],
      schedule: "",
      teamIds: [] as string[],
      noticeTitle: "",
      noticeText: "",
      noticeExpiresAt: "",
      media: [] as MediaItem[],
    };
  }
  return {
    status: "draft" as Status,
    description: "",
    date: "",
    time: "",
    address: "",
    media: [] as MediaItem[],
  };
}

function asDate(value?: Timestamp) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value.toDate());
}

function publicQuery(collectionName: CollectionName) {
  return query(collection(db, collectionName), where("status", "==", "published"), orderBy("updatedAt", "desc"));
}

function adminQuery(collectionName: CollectionName) {
  return query(collection(db, collectionName), orderBy("updatedAt", "desc"));
}

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível comprimir a imagem.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_IMAGE_BYTES && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem."))), "image/webp", quality);
  });
}

async function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Não foi possível ler o vídeo."));
    video.src = URL.createObjectURL(file);
  });
}

async function compressVideo(file: File, onProgress: (message: string) => void) {
  if (file.size > MAX_VIDEO_INPUT_BYTES) {
    throw new Error("Vídeo muito grande. Envie um arquivo de até 75 MB.");
  }
  const duration = await getVideoDuration(file);
  if (duration > MAX_VIDEO_SECONDS) {
    throw new Error("Vídeo muito longo. O limite é de 90 segundos.");
  }

  onProgress("Carregando compressor de vídeo...");
  const [{ FFmpeg }, { fetchFile }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  onProgress("Comprimindo vídeo...");
  await ffmpeg.writeFile("input.mp4", await fetchFile(file));
  await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-vf",
    "scale='min(960,iw)':-2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "output.mp4",
  ]);
  const data = await ffmpeg.readFile("output.mp4");
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], file.name.replace(/\.[^.]+$/, ".mp4"), { type: "video/mp4" });
}

async function uploadCompressedMedia(
  collectionName: CollectionName,
  docId: string,
  files: FileList | File[],
  currentCount: number,
  onProgress: (message: string) => void,
) {
  const incoming = Array.from(files);
  const result: MediaItem[] = [];
  for (const file of incoming) {
    const isVideo = file.type.startsWith("video/");
    const compressed = isVideo ? await compressVideo(file, onProgress) : await compressImage(file);
    const safeName = `${Date.now()}-${crypto.randomUUID()}-${compressed.name}`.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${collectionName}/${docId}/${safeName}`;
    onProgress(`Enviando ${compressed.name}...`);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, compressed, { contentType: compressed.type });
    const url = await getDownloadURL(storageRef);
    result.push({
      url,
      type: isVideo ? "video" : "image",
      path,
      name: compressed.name,
      size: compressed.size,
      order: currentCount + result.length,
    });
  }
  return result;
}

function useCollection<T extends AnyContent>(collectionName: CollectionName, admin = false) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(admin ? adminQuery(collectionName) : publicQuery(collectionName), (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
      setLoading(false);
    });
    return unsubscribe;
  }, [admin, collectionName]);

  return { items, loading };
}

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (current) => {
      setUser(current);
      if (current) {
        const token = await current.getIdTokenResult(true);
        setClaims(token.claims);
      } else {
        setClaims({});
      }
      setLoading(false);
    });
  }, []);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
  const isAdmin = Boolean(claims.admin) || isSuperAdmin;
  return { user, claims, loading, isAdmin, isSuperAdmin };
}

function Header() {
  const { pathname } = useLocation();

  return (
    <header className="site-header">
      <section className="public-intro">
        <video
          src={presentationVideoUrl}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = 1;
          }}
          onEnded={(event) => {
            event.currentTarget.currentTime = 1;
            void event.currentTarget.play();
          }}
        />
        <Link className="intro-brand" to="/">
          <img src={logoUrl} alt="Logo Chão Batido" />
        </Link>
        <p>Capoeira, cultura e comunidade</p>
        <h1>Chão Batido</h1>
      </section>
      <nav className="main-nav">
        {sections.map((section) => (
          <NavLink
            key={section.collectionName}
            to={section.path}
            className={({ isActive }) =>
              isActive || (section.collectionName === "publications" && pathname === "/publicacoes")
                ? "active"
                : undefined
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function MediaCarousel({ media = [], compact = false }: { media?: MediaItem[]; compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const item = media[index];
  if (!item) return <div className="media-empty">Sem mídia</div>;

  return (
    <div className={compact ? "carousel compact" : "carousel"}>
      {item.type === "video" ? (
        <video src={item.url} controls playsInline />
      ) : (
        <img src={item.url} alt={item.name || "Mídia"} />
      )}
      {media.length > 1 && (
        <div className="carousel-controls">
          <button type="button" onClick={() => setIndex((index + media.length - 1) % media.length)} aria-label="Anterior">
            &lt;
          </button>
          <span>{index + 1}/{media.length}</span>
          <button type="button" onClick={() => setIndex((index + 1) % media.length)} aria-label="Próximo">
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

function PublicSection<T extends AnyContent>({
  config,
  render,
}: {
  config: SectionConfig;
  render: (item: T) => ReactElement;
}) {
  const { items, loading } = useCollection<T>(config.collectionName);
  return (
    <section id={config.collectionName} className="public-section">
      <div className="public-section-inner">
        <div className="section-heading">
          <p>Chão Batido</p>
          <h2>{config.label}</h2>
        </div>
        {loading ? <p className="muted">Carregando...</p> : null}
        {!loading && items.length === 0 ? <p className="muted">Nenhum conteúdo publicado ainda.</p> : null}
        <div className={config.kind === "publication" ? "publication-grid" : "card-grid"}>
          {items.map((item) => render(item))}
        </div>
      </div>
    </section>
  );
}

function PublicationsPage() {
  return (
    <main>
      <PublicSection<Publication>
        config={sections[0]}
        render={(item) => (
          <article className="publication-card" key={item.id}>
            <MediaCarousel media={item.media} />
            <div className="card-body">
              <p>{item.description}</p>
              <MetaLine item={item} />
            </div>
          </article>
        )}
      />
    </main>
  );
}

function EventsPage() {
  return (
    <main>
      <PublicSection<EventItem>
        config={sections[1]}
        render={(item) => (
          <article className="content-card" key={item.id}>
            <MediaCarousel media={item.media} compact />
            <div className="card-body">
              <h3>{item.date || "Evento"}</h3>
              <p>{item.description}</p>
              <MetaLine item={item} />
            </div>
          </article>
        )}
      />
    </main>
  );
}

function InitiativesPage() {
  return (
    <main>
      <PublicSection<Initiative>
        config={sections[2]}
        render={(item) => (
          <article className="content-card" key={item.id}>
            <MediaCarousel media={item.media} compact />
            <div className="card-body">
              <h3>{item.days?.join(", ") || "Iniciativa"}</h3>
              <p>{item.description}</p>
              <p className="muted">{item.schedule}</p>
              {noticeIsActive(item) ? (
                <div className="notice">
                  <strong>{item.noticeTitle}</strong>
                  <p>{item.noticeText}</p>
                </div>
              ) : null}
              <MetaLine item={item} />
            </div>
          </article>
        )}
      />
    </main>
  );
}

function TeamPage() {
  return (
    <main>
      <PublicSection<TeamMember>
        config={sections[3]}
        render={(item) => (
          <article className="content-card member-card" key={item.id}>
            {item.photo ? <img src={item.photo.url} alt={item.name || "Membro"} /> : null}
            <div className="card-body">
              <h3>{item.name}</h3>
              <p className="muted">{item.graduation} {item.age ? `- ${item.age} anos` : ""}</p>
              <p>{item.history}</p>
            </div>
          </article>
        )}
      />
    </main>
  );
}

function StoriesPage() {
  return (
    <main>
      <PublicSection<Story>
        config={sections[4]}
        render={(item) => (
          <article className="story-card" key={item.id}>
            <h3>{item.title}</h3>
            {item.blocks?.map((block) =>
              block.type === "image" && block.media ? (
                <img key={block.id} src={block.media.url} alt={block.media.name || item.title || "História"} />
              ) : (
                <p key={block.id}>{block.text}</p>
              ),
            )}
          </article>
        )}
      />
    </main>
  );
}

function MetaLine({ item }: { item: ContentBase }) {
  return (
    <div className="meta-line">
      {item.date ? <span>{item.date}</span> : null}
      {item.time ? <span>{item.time}</span> : null}
      {item.address ? <span>{item.address}</span> : null}
    </div>
  );
}

function noticeIsActive(item: Initiative) {
  if (!item.noticeTitle && !item.noticeText) return false;
  if (!item.noticeExpiresAt) return true;
  return new Date(item.noticeExpiresAt + "T23:59:59").getTime() >= Date.now();
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user && isAdmin) navigate("/admin/dashboard");
  }, [isAdmin, loading, navigate, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin/dashboard");
    } catch {
      setError("Não foi possível entrar. Confira e-mail e senha.");
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <img src={logoUrl} alt="Chão Batido" />
        <h1>Área administrativa</h1>
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Senha
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary-button" type="submit">Entrar</button>
      </form>
    </main>
  );
}

function AdminLayout() {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/admin");
  }, [isAdmin, loading, navigate, user]);

  if (loading) return <main className="admin-shell"><p>Carregando...</p></main>;
  if (!user || !isAdmin) return null;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" to="/">
          <img src={logoUrl} alt="Logo" />
          <span>Admin</span>
        </Link>
        {sections.map((section) => (
          <NavLink key={section.collectionName} to={`/admin/dashboard/${section.collectionName}`}>
            {section.label}
          </NavLink>
        ))}
        {isSuperAdmin ? <NavLink to="/admin/dashboard/admins">Admins</NavLink> : null}
        <button type="button" onClick={() => signOut(auth)}>Sair</button>
      </aside>
      <Routes>
        <Route path="" element={<AdminHome />} />
        {sections.map((section) => (
          <Route key={section.collectionName} path={section.collectionName} element={<CrudSection config={section} />} />
        ))}
        <Route path="admins" element={<AdminUsers />} />
      </Routes>
    </main>
  );
}

function AdminHome() {
  return (
    <section className="admin-panel">
      <h1>Conteudo do site</h1>
      <p className="muted">Escolha uma seção para cadastrar, editar, publicar ou remover conteúdos.</p>
      <div className="admin-shortcuts">
        {sections.map((section) => (
          <Link key={section.collectionName} to={`/admin/dashboard/${section.collectionName}`}>
            {section.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function CrudSection({ config }: { config: SectionConfig }) {
  const { user } = useAuth();
  const { items, loading } = useCollection<AnyContent>(config.collectionName, true);
  const [editing, setEditing] = useState<AnyContent | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm(config.kind));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(editing ? normalizeForForm(config.kind, editing) : emptyForm(config.kind));
  }, [config.kind, editing]);

  async function save(status?: Status) {
    setBusy(true);
    setMessage("");
    try {
      const payload = buildPayload(config.kind, form, status);
      if (editing) {
        await updateDoc(doc(db, config.collectionName, editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || "",
        });
        setMessage("Conteudo atualizado.");
      } else {
        const created = await addDoc(collection(db, config.collectionName), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid || "",
          updatedBy: user?.uid || "",
        });
        setEditing({ id: created.id, ...payload });
        setMessage("Conteúdo criado. Agora você pode anexar mídias.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AnyContent) {
    if (!confirm(`Excluir ${config.singular.toLowerCase()}?`)) return;
    await deleteDoc(doc(db, config.collectionName, item.id));
    if (editing?.id === item.id) setEditing(null);
  }

  async function addMedia(files: FileList | null, field: "media" | "photo" | "storyImage" = "media", blockId?: string) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("Preparando mídia...");
    try {
      let target = editing;
      if (!target) {
        const payload = buildPayload(config.kind, form);
        const created = await addDoc(collection(db, config.collectionName), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid || "",
          updatedBy: user?.uid || "",
        });
        target = { id: created.id, ...payload };
        setEditing(target);
      }
      const docId = target.id;
      const currentMedia = Array.isArray(form.media) ? (form.media as MediaItem[]) : [];
      enforceMediaLimit(config.kind, field, currentMedia, files, form);
      const uploaded = await uploadCompressedMedia(config.collectionName, docId, files, currentMedia.length, setMessage);
      if (field === "photo") {
        setEditing({ ...target, photo: uploaded[0] } as AnyContent);
        setForm((current) => ({ ...current, photo: uploaded[0] }));
      } else if (field === "storyImage") {
        const updatedBlocks = ((form.blocks as StoryBlock[]) || []).map((block) =>
          block.id === blockId ? { ...block, type: "image" as StoryBlockType, media: uploaded[0] } : block,
        );
        setEditing({ ...target, blocks: updatedBlocks } as AnyContent);
        setForm((current) => ({
          ...current,
          blocks: updatedBlocks,
        }));
      } else {
        const updatedMedia = [...currentMedia, ...uploaded];
        setEditing({ ...target, media: updatedMedia } as AnyContent);
        setForm((current) => ({ ...current, media: updatedMedia }));
      }
      setMessage("Mídia comprimida e anexada. Salve o conteúdo para persistir a referência.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-title">
        <div>
          <h1>{config.label}</h1>
          <p className="muted">Cadastre, edite, publique ou mantenha em rascunho.</p>
        </div>
        <button type="button" onClick={() => setEditing(null)}>Novo</button>
      </div>

      <div className="crud-layout">
        <div className="editor">
          <ContentForm config={config} form={form} setForm={setForm} addMedia={addMedia} />
          {message ? <p className="status-message">{message}</p> : null}
          <div className="form-actions">
            <button disabled={busy} type="button" onClick={() => save("draft")}>Salvar rascunho</button>
            <button disabled={busy} className="primary-button" type="button" onClick={() => save("published")}>Publicar</button>
          </div>
        </div>
        <div className="item-list">
          {loading ? <p>Carregando...</p> : null}
          {items.map((item) => (
            <article key={item.id} className={editing?.id === item.id ? "list-item active" : "list-item"}>
              <button type="button" onClick={() => setEditing(item)}>
                <strong>{itemTitle(config.kind, item)}</strong>
                <span>{item.status} - {asDate(item.updatedAt)}</span>
              </button>
              <button type="button" className="danger" onClick={() => remove(item)}>Excluir</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContentForm({
  config,
  form,
  setForm,
  addMedia,
}: {
  config: SectionConfig;
  form: Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  addMedia: (files: FileList | null, field?: "media" | "photo" | "storyImage", blockId?: string) => void;
}) {
  const update = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));

  if (config.kind === "story") {
    const blocks = (form.blocks as StoryBlock[]) || [];
    const imageCount = blocks.filter((block) => block.type === "image").length;
    return (
      <div className="form-grid">
        <label>Título<input value={(form.title as string) || ""} onChange={(event) => update("title", event.target.value)} /></label>
        <BlockStatus form={form} update={update} />
        <div className="wide">
          <div className="block-toolbar">
            <button type="button" onClick={() => update("blocks", [...blocks, { id: crypto.randomUUID(), type: "text", text: "" }])}>
              Adicionar texto
            </button>
            <button
              type="button"
              disabled={imageCount >= 2}
              onClick={() => update("blocks", [...blocks, { id: crypto.randomUUID(), type: "image" }])}
            >
              Adicionar imagem
            </button>
          </div>
          {blocks.map((block, index) => (
            <div className="story-editor-block" key={block.id}>
              <div className="block-actions">
                <button type="button" disabled={index === 0} onClick={() => update("blocks", move(blocks, index, index - 1))}>Subir</button>
                <button type="button" disabled={index === blocks.length - 1} onClick={() => update("blocks", move(blocks, index, index + 1))}>Descer</button>
                <button type="button" onClick={() => update("blocks", blocks.filter((item) => item.id !== block.id))}>Remover</button>
              </div>
              {block.type === "image" ? (
                <>
                  {block.media ? <img src={block.media.url} alt={block.media.name} /> : null}
                  <input type="file" accept="image/*" onChange={(event) => addMedia(event.target.files, "storyImage", block.id)} />
                </>
              ) : (
                <textarea value={block.text || ""} onChange={(event) => update("blocks", blocks.map((item) => item.id === block.id ? { ...item, text: event.target.value } : item))} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (config.kind === "team") {
    const photo = form.photo as MediaItem | undefined;
    return (
      <div className="form-grid">
        <label>Nome<input value={(form.name as string) || ""} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Graduação<input value={(form.graduation as string) || ""} onChange={(event) => update("graduation", event.target.value)} /></label>
        <label>Idade<input type="number" value={(form.age as string | number) || ""} onChange={(event) => update("age", event.target.value)} /></label>
        <BlockStatus form={form} update={update} />
        <label className="wide">História<textarea value={(form.history as string) || ""} onChange={(event) => update("history", event.target.value)} /></label>
        <label className="wide">Foto<input type="file" accept="image/*" onChange={(event) => addMedia(event.target.files, "photo")} /></label>
        {photo ? <img className="preview" src={photo.url} alt={photo.name} /> : null}
      </div>
    );
  }

  return (
    <div className="form-grid">
      <BlockStatus form={form} update={update} />
      {config.kind !== "initiative" ? (
        <>
          <label>Data<input type="date" value={(form.date as string) || ""} onChange={(event) => update("date", event.target.value)} /></label>
          <label>Horário<input type="time" value={(form.time as string) || ""} onChange={(event) => update("time", event.target.value)} /></label>
        </>
      ) : null}
      <label className="wide">Endereço<input value={(form.address as string) || ""} onChange={(event) => update("address", event.target.value)} /></label>
      <label className="wide">Descrição<textarea value={(form.description as string) || ""} onChange={(event) => update("description", event.target.value)} /></label>
      {config.kind === "initiative" ? <InitiativeFields form={form} update={update} /> : null}
      <label className="wide">
        Mídias
        <input type="file" multiple accept={config.kind === "publication" ? "image/*,video/*" : "image/*"} onChange={(event) => addMedia(event.target.files)} />
      </label>
      <MediaPreview media={(form.media as MediaItem[]) || []} onRemove={(index) => update("media", ((form.media as MediaItem[]) || []).filter((_, i) => i !== index))} />
    </div>
  );
}

function BlockStatus({ form, update }: { form: Record<string, unknown>; update: (key: string, value: unknown) => void }) {
  return (
    <label>
      Status
      <select value={(form.status as string) || "draft"} onChange={(event) => update("status", event.target.value as Status)}>
        <option value="draft">Rascunho</option>
        <option value="published">Publicado</option>
      </select>
    </label>
  );
}

function InitiativeFields({ form, update }: { form: Record<string, unknown>; update: (key: string, value: unknown) => void }) {
  const days = (form.days as string[]) || [];
  return (
    <>
      <div className="wide check-grid">
        {weekDays.map((day) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={days.includes(day)}
              onChange={(event) => update("days", event.target.checked ? [...days, day] : days.filter((item) => item !== day))}
            />
            {day}
          </label>
        ))}
      </div>
      <label>Horários<input value={(form.schedule as string) || ""} onChange={(event) => update("schedule", event.target.value)} placeholder="Ex: 19h às 21h" /></label>
      <label>Responsáveis<input value={((form.teamIds as string[]) || []).join(", ")} onChange={(event) => update("teamIds", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="IDs ou nomes separados por vírgula" /></label>
      <label>Título da notícia<input value={(form.noticeTitle as string) || ""} onChange={(event) => update("noticeTitle", event.target.value)} /></label>
      <label>Validade da notícia<input type="date" value={(form.noticeExpiresAt as string) || ""} onChange={(event) => update("noticeExpiresAt", event.target.value)} /></label>
      <label className="wide">Notícia<textarea value={(form.noticeText as string) || ""} onChange={(event) => update("noticeText", event.target.value)} /></label>
    </>
  );
}

function MediaPreview({ media, onRemove }: { media: MediaItem[]; onRemove: (index: number) => void }) {
  return (
    <div className="media-preview wide">
      {media.map((item, index) => (
        <div key={item.path}>
          {item.type === "video" ? <video src={item.url} controls /> : <img src={item.url} alt={item.name} />}
          <button type="button" onClick={() => onRemove(index)}>Remover</button>
        </div>
      ))}
    </div>
  );
}

function AdminUsers() {
  const { isSuperAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  if (!isSuperAdmin) return <section className="admin-panel"><h1>Acesso restrito</h1></section>;

  async function createAdmin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      const fn = httpsCallable(functions, "createAdminUser");
      await fn({ email, password, displayName });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setMessage("Admin criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar admin.");
    }
  }

  return (
    <section className="admin-panel narrow">
      <h1>Cadastrar admin</h1>
      <form className="form-grid" onSubmit={createAdmin}>
        <label>Nome<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Senha temporária<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="primary-button" type="submit">Criar admin</button>
      </form>
      {message ? <p className="status-message">{message}</p> : null}
    </section>
  );
}

function normalizeForForm(kind: SectionConfig["kind"], item: AnyContent) {
  if (kind === "team") return { ...emptyForm(kind), ...item, age: (item as TeamMember).age || "" };
  return { ...emptyForm(kind), ...item };
}

function buildPayload(kind: SectionConfig["kind"], form: Record<string, unknown>, forcedStatus?: Status) {
  const status = forcedStatus || (form.status as Status) || "draft";
  if (kind === "story") {
    const blocks = ((form.blocks as StoryBlock[]) || []).filter((block) => block.type === "image" ? block.media : block.text?.trim());
    if (!String(form.title || "").trim()) throw new Error("Informe o titulo.");
    if (blocks.filter((block) => block.type === "image").length > 2) throw new Error("Histórias aceitam no máximo 2 imagens.");
    return { title: String(form.title), blocks, status };
  }
  if (kind === "team") {
    if (!String(form.name || "").trim()) throw new Error("Informe o nome.");
    return {
      name: String(form.name || ""),
      graduation: String(form.graduation || ""),
      age: form.age ? Number(form.age) : null,
      history: String(form.history || ""),
      photo: (form.photo as MediaItem) || null,
      status,
    };
  }
  const media = ((form.media as MediaItem[]) || []).map((item, index) => ({ ...item, order: index }));
  if (kind === "publication") {
    const imageCount = media.filter((item) => item.type === "image").length;
    const videoCount = media.filter((item) => item.type === "video").length;
    if (imageCount > 3 || videoCount > 1) throw new Error("Publicações aceitam até 3 imagens e 1 vídeo.");
  }
  if ((kind === "event" || kind === "initiative") && media.length > 3) throw new Error("Este conteúdo aceita até 3 imagens.");
  return {
    description: String(form.description || ""),
    date: String(form.date || ""),
    time: String(form.time || ""),
    address: String(form.address || ""),
    media,
    status,
    ...(kind === "initiative" ? {
      days: (form.days as string[]) || [],
      schedule: String(form.schedule || ""),
      teamIds: (form.teamIds as string[]) || [],
      noticeTitle: String(form.noticeTitle || ""),
      noticeText: String(form.noticeText || ""),
      noticeExpiresAt: String(form.noticeExpiresAt || ""),
    } : {}),
  };
}

function enforceMediaLimit(
  kind: SectionConfig["kind"],
  field: "media" | "photo" | "storyImage",
  currentMedia: MediaItem[],
  files: FileList,
  form: Record<string, unknown>,
) {
  if (field === "photo" && files.length > 1) throw new Error("Escolha apenas uma foto.");
  if (field === "storyImage") {
    const blocks = (form.blocks as StoryBlock[]) || [];
    if (blocks.filter((block) => block.type === "image" && block.media).length >= 2) throw new Error("Histórias aceitam no máximo 2 imagens.");
    return;
  }
  const incoming = Array.from(files);
  if (kind === "publication") {
    const images = currentMedia.filter((item) => item.type === "image").length + incoming.filter((file) => file.type.startsWith("image/")).length;
    const videos = currentMedia.filter((item) => item.type === "video").length + incoming.filter((file) => file.type.startsWith("video/")).length;
    if (images > 3 || videos > 1) throw new Error("Publicações aceitam até 3 imagens e 1 vídeo.");
  } else if (currentMedia.length + incoming.length > 3) {
    throw new Error("Este conteúdo aceita até 3 imagens.");
  }
}

function itemTitle(kind: SectionConfig["kind"], item: AnyContent) {
  if (kind === "team") return (item as TeamMember).name || "Membro sem nome";
  if (kind === "story") return (item as Story).title || "História sem título";
  return item.description || item.date || "Conteúdo sem título";
}

function move<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function NotFound() {
  return <main className="public-section"><div className="public-section-inner"><h1>Página não encontrada</h1></div></main>;
}

export default function App() {
  const header = useMemo(() => <Header />, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/admin/dashboard/*" element={<AdminLayout />} />
        <Route path="/" element={<>{header}<PublicationsPage /></>} />
        <Route path="/publicacoes" element={<>{header}<PublicationsPage /></>} />
        <Route path="/eventos" element={<>{header}<EventsPage /></>} />
        <Route path="/iniciativas" element={<>{header}<InitiativesPage /></>} />
        <Route path="/equipe" element={<>{header}<TeamPage /></>} />
        <Route path="/historia" element={<>{header}<StoriesPage /></>} />
        <Route path="*" element={<>{header}<NotFound /></>} />
      </Routes>
    </BrowserRouter>
  );
}
