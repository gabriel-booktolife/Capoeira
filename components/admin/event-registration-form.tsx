"use client";

import Image from "next/image";
import { CalendarDays, CheckCircle2, ImagePlus, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import { ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveContentAction } from "@/lib/actions/content";
import { commitMediaAction } from "@/lib/actions/media";
import { auth, storage } from "@/lib/firebase/client";
import { readMediaMetadata } from "@/lib/media/client";

type EventFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  address: string;
};

type CoverImage = { file: File; preview: string };
type FieldName = keyof EventFormValues | "cover";
type FieldErrors = Partial<Record<FieldName, string>>;

const initialValues: EventFormValues = { title: "", description: "", date: "", time: "", address: "" };
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function validate(values: EventFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.title.trim();
  const address = values.address.trim();
  if (name.length < 3) errors.title = "Informe um nome entre 3 e 100 caracteres.";
  else if (name.length > 100) errors.title = "O nome deve ter no máximo 100 caracteres.";
  if (values.description.length > 1000) errors.description = "A descrição deve ter no máximo 1.000 caracteres.";
  if (!values.date) errors.date = "Informe a data do evento.";
  else if (values.date < today()) errors.date = "Escolha uma data de hoje ou futura.";
  if (!values.time) errors.time = "Informe o horário do evento.";
  if (address.length < 3) errors.address = "Informe um local entre 3 e 150 caracteres.";
  else if (address.length > 150) errors.address = "O local deve ter no máximo 150 caracteres.";
  return errors;
}

export function EventRegistrationForm() {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [cover, setCover] = useState<CoverImage | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdEvent, setCreatedEvent] = useState<{ id: string; slug: string } | null>(null);
  useEffect(() => () => { if (cover) URL.revokeObjectURL(cover.preview); }, [cover]);

  function update<Key extends keyof EventFormValues>(key: Key, value: EventFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
  }

  function focusField(field: FieldName) {
    const id = field === "title" ? "event-title" : field === "description" ? "event-description" : field === "date" ? "event-date" : field === "time" ? "event-time" : field === "address" ? "event-address" : "event-cover";
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  function rejectCover(message: string) {
    setErrors((current) => ({ ...current, cover: message }));
  }

  function selectCover(file: File | undefined) {
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      rejectCover("Envie uma imagem em JPG, PNG ou WebP.");
      return;
    }
    if (file.size > maxImageSize) {
      rejectCover("A imagem de capa deve ter no máximo 5 MB.");
      return;
    }
    setCover((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
    setErrors((current) => ({ ...current, cover: undefined }));
    setMessage("");
  }

  function removeCover() {
    setCover((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return null;
    });
  }

  async function uploadCover(documentId: string, file: File) {
    if (!auth.currentUser) throw new Error("Sua sessão expirou. Entre novamente para enviar a imagem.");
    const uploadId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const stagingPath = `staging/${auth.currentUser.uid}/${uploadId}/${safeName}`;
    const task = uploadBytesResumable(ref(storage, stagingPath), file, { contentType: file.type });
    await new Promise<void>((resolve, reject) => task.on("state_changed", (snapshot) => {
      setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
    }, reject, resolve));
    const metadata = await readMediaMetadata(file);
    const result = await commitMediaAction({ collection: "events", documentId, stagingPath, originalName: file.name, target: "media", alt: "", ...metadata });
    if (!result.ok) throw new Error(result.error);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0] as FieldName | undefined;
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setBusy(true);
    setMessage("");
    setProgress(0);
    try {
      let saved = createdEvent;
      if (!saved) {
        const result = await saveContentAction("events", null, {
          title: values.title.trim(),
          description: values.description.trim(),
          date: values.date,
          time: values.time,
          address: values.address.trim(),
          media: [],
        }, "published");
        if (!result.ok) {
          const serverErrors = Object.fromEntries(Object.entries(result.fieldErrors || {}).map(([key, messages]) => [key, messages[0]]));
          setErrors(serverErrors as FieldErrors);
          setMessage(result.error);
          const firstServerInvalid = Object.keys(serverErrors)[0] as FieldName | undefined;
          if (firstServerInvalid) focusField(firstServerInvalid);
          return;
        }
        saved = { id: result.data.id, slug: String(result.data.slug || "") };
        setCreatedEvent(saved);
      }
      if (cover) await uploadCover(saved.id, cover.file);
      setSuccess(true);
      setMessage("Evento cadastrado com sucesso. Abrindo a página pública do evento…");
      window.setTimeout(() => router.push(`/eventos/${saved.slug}`), 900);
    } catch (error) {
      const prefix = createdEvent ? "O evento foi salvo, mas a imagem não pôde ser enviada. " : "";
      setMessage(`${prefix}${error instanceof Error ? error.message : "Não foi possível cadastrar o evento. Tente novamente."}`);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  const field = (name: FieldName) => ({
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    "aria-invalid": Boolean(errors[name]),
  });

  return <section className="event-registration" aria-labelledby="event-registration-title">
    <header className="event-registration-header">
      <span className="admin-eyebrow">Eventos</span>
      <h1 id="event-registration-title">Cadastrar evento</h1>
      <p>Reúna as informações essenciais para divulgar seu próximo encontro.</p>
    </header>

    <form className="event-registration-form" onSubmit={(event) => void submit(event)} noValidate>
      <fieldset className="event-registration-section" disabled={busy || Boolean(createdEvent)}>
        <legend>Informações do evento</legend>
        <p className="event-section-description">Os dados que aparecem primeiro para quem encontra o evento.</p>
        <label className="field" htmlFor="event-title"><span>Nome do evento <b aria-hidden="true">*</b></span><input {...field("title")} id="event-title" name="title" value={values.title} maxLength={100} autoComplete="off" onChange={(event) => update("title", event.target.value)} />{errors.title ? <p className="field-error" id="title-error">{errors.title}</p> : null}</label>
        <label className="field" htmlFor="event-description"><span>Descrição <em>(opcional)</em></span><textarea {...field("description")} id="event-description" name="description" value={values.description} maxLength={1000} onChange={(event) => update("description", event.target.value)} />{errors.description ? <p className="field-error" id="description-error">{errors.description}</p> : null}<small className="character-count" aria-live="polite">{values.description.length} / 1.000</small></label>
      </fieldset>

      <fieldset className="event-registration-section">
        <legend>Data e local</legend>
        <p className="event-section-description">Defina quando e onde a comunidade vai se encontrar.</p>
        <div className="event-date-time-grid">
          <label className="field" htmlFor="event-date"><span>Data <b aria-hidden="true">*</b></span><input {...field("date")} id="event-date" name="date" type="date" min={today()} value={values.date} disabled={busy || Boolean(createdEvent)} onChange={(event) => update("date", event.target.value)} />{errors.date ? <p className="field-error" id="date-error">{errors.date}</p> : null}</label>
          <label className="field" htmlFor="event-time"><span>Horário <b aria-hidden="true">*</b></span><input {...field("time")} id="event-time" name="time" type="time" value={values.time} disabled={busy || Boolean(createdEvent)} onChange={(event) => update("time", event.target.value)} />{errors.time ? <p className="field-error" id="time-error">{errors.time}</p> : null}</label>
        </div>
        <label className="field" htmlFor="event-address"><span>Local <b aria-hidden="true">*</b></span><span className="event-input-with-icon"><MapPin size={18} aria-hidden="true" /><input {...field("address")} id="event-address" name="address" value={values.address} maxLength={150} autoComplete="street-address" disabled={busy || Boolean(createdEvent)} onChange={(event) => update("address", event.target.value)} /></span>{errors.address ? <p className="field-error" id="address-error">{errors.address}</p> : null}</label>
      </fieldset>

      <fieldset className="event-registration-section" disabled={busy}>
        <legend>Imagem de capa <em>(opcional)</em></legend>
        <p className="event-section-description">Envie JPG, PNG ou WebP de até 5 MB.</p>
        {cover ? <div className="event-cover-preview"><Image src={cover.preview} alt="Prévia da imagem de capa" width={720} height={405} unoptimized /><div><strong>{cover.file.name}</strong><small>{Math.ceil(cover.file.size / 1024)} KB</small></div><button className="admin-button danger" type="button" onClick={removeCover}><Trash2 size={16} /> Remover imagem</button></div> : <label className="event-cover-picker"><ImagePlus size={24} aria-hidden="true" /><strong>Adicionar imagem de capa</strong><span>Escolher arquivo</span><input {...field("cover")} id="event-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { selectCover(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>}
        {errors.cover ? <p className="field-error" id="cover-error">{errors.cover}</p> : null}
        {busy && cover ? <div className="event-upload-progress" aria-label={`Envio da imagem: ${progress}%`}><span style={{ width: `${progress}%` }} /></div> : null}
      </fieldset>

      {message ? <p className={success ? "event-success" : "form-message error"} role="status">{success ? <CheckCircle2 size={18} aria-hidden="true" /> : null}{message}</p> : null}
      <div className="event-registration-actions">
        <button className="admin-button primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Cadastrando…</> : <><CalendarDays size={17} /> {createdEvent ? "Tentar enviar imagem" : "Cadastrar evento"}</>}</button>
        <button className="admin-button" type="button" disabled={busy} onClick={() => router.push("/admin/dashboard/events")}>Cancelar</button>
      </div>
    </form>
  </section>;
}
