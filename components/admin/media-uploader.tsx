"use client";

import Image from "next/image";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { deleteObject, ref, uploadBytesResumable } from "firebase/storage";
import { useState } from "react";
import { commitMediaAction, removeMediaAction, updateMediaMetadataAction } from "@/lib/actions/media";
import type { ContentCollection, MediaItem } from "@/lib/content/types";
import { auth, storage } from "@/lib/firebase/client";
import { compressMedia, readMediaMetadata } from "@/lib/media/client";

type Target = "media" | "photo" | "storyBlock";

export function MediaUploader({
  collection,
  documentId,
  target,
  blockId,
  media,
  accept = "image/*",
  multiple = false,
  disabled = false,
  onChange,
}: {
  collection: ContentCollection;
  documentId: string | null;
  target: Target;
  blockId?: string;
  media: MediaItem[];
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onChange: (media: MediaItem[]) => void;
}) {
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length || !documentId || !auth.currentUser) return;
    setBusy(true);
    setMessage("Preparando mídia…");
    try {
      const next = [...media];
      for (const file of Array.from(files)) {
        const optimized = await compressMedia(file, setMessage);
        const metadata = await readMediaMetadata(optimized);
        const uploadId = crypto.randomUUID();
        const stagingPath = `staging/${auth.currentUser.uid}/${uploadId}/${optimized.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const stagingRef = ref(storage, stagingPath);
        const task = uploadBytesResumable(stagingRef, optimized, { contentType: optimized.type });
        await new Promise<void>((resolve, reject) => {
          task.on("state_changed", (snapshot) => {
            setMessage(`Enviando ${optimized.name}…`);
            setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
          }, reject, resolve);
        });
        const result = await commitMediaAction({ collection, documentId, stagingPath, originalName: optimized.name, target, blockId, alt: "", ...metadata });
        if (!result.ok) {
          await deleteObject(stagingRef).catch(() => undefined);
          throw new Error(result.error);
        }
        if (target === "photo" || target === "storyBlock") next.splice(0, next.length, result.data);
        else next.push(result.data);
      }
      onChange(next);
      setMessage("Mídia anexada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function updateMetadata(item: MediaItem, patch: Partial<Pick<MediaItem, "alt" | "caption">>) {
    if (!documentId) return;
    const nextItem = { ...item, ...patch };
    onChange(media.map((entry) => entry.path === item.path ? nextItem : entry));
    const result = await updateMediaMetadataAction({ collection, documentId, path: item.path, target, blockId, alt: nextItem.alt || "", caption: nextItem.caption || "" });
    setMessage(result.ok ? result.message || "Descrição atualizada." : result.error);
  }

  async function remove(item: MediaItem) {
    if (!documentId || !window.confirm("Remover esta mídia definitivamente?")) return;
    setBusy(true);
    const result = await removeMediaAction({ collection, documentId, path: item.path, target, blockId });
    if (result.ok) {
      onChange(media.filter((entry) => entry.path !== item.path));
      setMessage(result.message || "Mídia removida.");
    } else setMessage(result.error);
    setBusy(false);
  }

  return (
    <div className="wide">
      <div className="upload-dropzone">
        {accept.includes("video") ? <UploadCloud aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
        <strong>{documentId ? "Adicione mídias otimizadas" : "Salve o rascunho para liberar o upload"}</strong>
        <small>As mídias só aparecem no site depois da publicação.</small>
        <input type="file" accept={accept} multiple={multiple} disabled={disabled || busy || !documentId} onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ""; }} />
        {progress ? <div className="upload-progress" aria-label={`Upload ${progress}%`}><span style={{ width: `${progress}%` }} /></div> : null}
        {message ? <p className={message.toLowerCase().includes("falha") || message.toLowerCase().includes("inválid") ? "field-error" : "form-message"}>{message}</p> : null}
      </div>
      {media.length ? <div className="media-admin-grid">{media.map((item) => <div className="media-admin-item" key={item.path}>{item.type === "video" ? <video src={item.url} controls /> : <Image src={item.url} alt={item.alt || item.name} width={220} height={220} unoptimized={item.url.startsWith("http://127.0.0.1")} />}<div className="media-metadata"><label className="field"><span>Texto alternativo</span><input value={item.alt || ""} maxLength={240} onChange={(event) => onChange(media.map((entry) => entry.path === item.path ? { ...entry, alt: event.target.value } : entry))} onBlur={(event) => void updateMetadata(item, { alt: event.target.value })} /></label><label className="field"><span>Legenda</span><textarea value={item.caption || ""} maxLength={500} onChange={(event) => onChange(media.map((entry) => entry.path === item.path ? { ...entry, caption: event.target.value } : entry))} onBlur={(event) => void updateMetadata(item, { caption: event.target.value })} /></label></div><footer><small title={item.name}>{item.name}</small><button className="admin-button danger" type="button" disabled={busy} onClick={() => void remove(item)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></footer></div>)}</div> : null}
    </div>
  );
}
