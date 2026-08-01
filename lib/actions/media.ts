"use server";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { sectionByCollection } from "@/lib/content/config";
import type { ContentCollection, MediaItem, StoryBlock } from "@/lib/content/types";
import { adminDb, adminStorage, firebaseStorageBucket } from "@/lib/firebase/admin";
import { actionError, type ActionResult } from "./shared";

type MediaTarget = "media" | "photo" | "storyBlock";

function safeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180);
}

function publicDownloadUrl(path: string, token: string) {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const origin = emulatorHost ? `http://${emulatorHost}` : "https://firebasestorage.googleapis.com";
  return `${origin}/v0/b/${encodeURIComponent(firebaseStorageBucket)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function validateLimit(collection: ContentCollection, media: MediaItem[], incomingType: "image" | "video") {
  if (collection === "publications") {
    const images = media.filter((item) => item.type === "image").length + (incomingType === "image" ? 1 : 0);
    const videos = media.filter((item) => item.type === "video").length + (incomingType === "video" ? 1 : 0);
    if (images > 3 || videos > 1) throw new Error("Publicações aceitam até 3 imagens e 1 vídeo.");
    return;
  }
  if (incomingType === "video") throw new Error("Esta seção aceita apenas imagens.");
  if (media.length >= 3) throw new Error("Esta seção aceita até 3 imagens.");
}

export async function commitMediaAction(input: {
  collection: ContentCollection;
  documentId: string;
  stagingPath: string;
  originalName: string;
  target: MediaTarget;
  blockId?: string;
  alt?: string;
  width?: number;
  height?: number;
  duration?: number;
}): Promise<ActionResult<MediaItem>> {
  let destinationPath = "";
  try {
    const session = await requireAdmin();
    if (!input.stagingPath.startsWith(`staging/${session.uid}/`)) throw new Error("Caminho temporário inválido.");
    if (!sectionByCollection[input.collection]) throw new Error("Seção inválida.");
    const ref = adminDb.collection(input.collection).doc(input.documentId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.status === "deleting") throw new Error("Salve o rascunho antes de enviar mídias.");

    const bucket = adminStorage.bucket();
    const source = bucket.file(input.stagingPath);
    const [exists] = await source.exists();
    if (!exists) throw new Error("O upload temporário não foi encontrado.");
    const [metadata] = await source.getMetadata();
    const contentType = String(metadata.contentType || "");
    const size = Number(metadata.size || 0);
    const mediaType = contentType.startsWith("video/") ? "video" : "image";
    if (mediaType === "image" && !contentType.startsWith("image/")) throw new Error("Formato de imagem inválido.");
    if (mediaType === "video" && contentType !== "video/mp4") throw new Error("O vídeo final precisa estar em MP4.");
    if (size <= 0 || size > 75 * 1024 * 1024) throw new Error("Arquivo vazio ou acima do limite permitido.");
    const [header] = await source.download({ start: 0, end: 15 });
    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP";
    const isMp4 = header.subarray(4, 8).toString() === "ftyp";
    if (mediaType === "image" && !isJpeg && !isPng && !isWebp) throw new Error("A assinatura do arquivo não corresponde a uma imagem permitida.");
    if (mediaType === "video" && !isMp4) throw new Error("A assinatura do arquivo não corresponde a um MP4 válido.");
    if (input.duration !== undefined && (!Number.isFinite(input.duration) || input.duration < 0 || input.duration > 90)) throw new Error("O vídeo pode ter no máximo 90 segundos.");

    const data = snapshot.data() || {};
    if (input.target === "photo" && input.collection !== "team") throw new Error("Destino de foto inválido.");
    if (input.target === "storyBlock" && input.collection !== "stories") throw new Error("Destino de bloco inválido.");
    const currentMedia = Array.isArray(data.media) ? data.media as MediaItem[] : [];
    if (input.target === "media") validateLimit(input.collection, currentMedia, mediaType);
    if (input.target === "photo" && mediaType !== "image") throw new Error("A foto da equipe precisa ser uma imagem.");
    if (input.target === "storyBlock") {
      if (mediaType !== "image") throw new Error("Histórias aceitam apenas imagens.");
      const blocks = (data.blocks || []) as StoryBlock[];
      const filledImages = blocks.filter((block) => block.type === "image" && block.media && block.id !== input.blockId).length;
      if (filledImages >= 2) throw new Error("Histórias aceitam até 2 imagens.");
      if (!blocks.some((block) => block.id === input.blockId)) throw new Error("Bloco de história não encontrado.");
    }

    const fileName = `${Date.now()}-${randomUUID()}-${safeName(input.originalName)}`;
    destinationPath = `${input.collection}/${input.documentId}/${fileName}`;
    const destination = bucket.file(destinationPath);
    const token = randomUUID();
    await source.copy(destination);
    await destination.setMetadata({
      contentType,
      cacheControl: "public,max-age=31536000,immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    });
    const media: MediaItem = {
      url: publicDownloadUrl(destinationPath, token),
      type: mediaType,
      path: destinationPath,
      name: safeName(input.originalName),
      size,
      order: input.target === "media" ? currentMedia.length : 0,
      alt: String(input.alt || "").slice(0, 240),
      caption: "",
      ...(Number.isInteger(input.width) && input.width! > 0 ? { width: input.width } : {}),
      ...(Number.isInteger(input.height) && input.height! > 0 ? { height: input.height } : {}),
      ...(mediaType === "video" && input.duration !== undefined ? { duration: input.duration } : {}),
    };

    await adminDb.runTransaction(async (transaction) => {
      const fresh = await transaction.get(ref);
      if (!fresh.exists || fresh.data()?.status === "deleting") throw new Error("O conteúdo não está mais disponível.");
      const freshData = fresh.data() || {};
      if (input.target === "media") {
        const list = Array.isArray(freshData.media) ? freshData.media as MediaItem[] : [];
        validateLimit(input.collection, list, mediaType);
        transaction.update(ref, { media: [...list, { ...media, order: list.length }], updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid });
      } else if (input.target === "photo") {
        transaction.update(ref, { photo: media, updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid });
      } else {
        const blocks = (freshData.blocks || []) as StoryBlock[];
        transaction.update(ref, {
          blocks: blocks.map((block) => block.id === input.blockId ? { ...block, type: "image", media } : block),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.uid,
        });
      }
    });
    await source.delete({ ignoreNotFound: true }).catch(() => undefined);
    revalidatePath("/", "layout");
    revalidatePath(`/admin/dashboard/${input.collection}`);
    return { ok: true, data: media, message: "Mídia otimizada e anexada." };
  } catch (error) {
    if (destinationPath) await adminStorage.bucket().file(destinationPath).delete({ ignoreNotFound: true }).catch(() => undefined);
    return actionError(error);
  }
}

export async function updateMediaMetadataAction(input: {
  collection: ContentCollection;
  documentId: string;
  path: string;
  target: MediaTarget;
  blockId?: string;
  alt: string;
  caption: string;
}): Promise<ActionResult<MediaItem>> {
  try {
    const session = await requireAdmin();
    const alt = input.alt.trim().slice(0, 240);
    const caption = input.caption.trim().slice(0, 500);
    const ref = adminDb.collection(input.collection).doc(input.documentId);
    let updated: MediaItem | null = null;
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Conteúdo não encontrado.");
      const data = snapshot.data() || {};
      const patch = (item: MediaItem) => item.path === input.path ? (updated = { ...item, alt, caption }) : item;
      if (input.target === "media") transaction.update(ref, { media: ((data.media || []) as MediaItem[]).map(patch), updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid });
      else if (input.target === "photo") { const photo = data.photo as MediaItem | undefined; if (!photo || photo.path !== input.path) throw new Error("Mídia não encontrada."); updated = { ...photo, alt, caption }; transaction.update(ref, { photo: updated, updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid }); }
      else { const blocks = (data.blocks || []) as StoryBlock[]; if (!blocks.some((block) => block.id === input.blockId && block.media?.path === input.path)) throw new Error("Mídia não encontrada."); transaction.update(ref, { blocks: blocks.map((block) => block.id === input.blockId && block.media ? { ...block, media: patch(block.media) } : block), updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid }); }
    });
    if (!updated) throw new Error("Mídia não encontrada.");
    revalidatePath("/", "layout");
    return { ok: true, data: updated, message: "Descrição da mídia atualizada." };
  } catch (error) { return actionError(error); }
}

export async function removeMediaAction(input: {
  collection: ContentCollection;
  documentId: string;
  path: string;
  target: MediaTarget;
  blockId?: string;
}): Promise<ActionResult<{ path: string }>> {
  try {
    const session = await requireAdmin();
    if (!input.path.startsWith(`${input.collection}/${input.documentId}/`)) throw new Error("Referência de mídia inválida.");
    const ref = adminDb.collection(input.collection).doc(input.documentId);
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Conteúdo não encontrado.");
      const data = snapshot.data() || {};
      if (input.target === "media") {
        const media = ((data.media || []) as MediaItem[])
          .filter((item) => item.path !== input.path)
          .map((item, order) => ({ ...item, order }));
        transaction.update(ref, { media, updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid });
      } else if (input.target === "photo") {
        transaction.update(ref, { photo: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: session.uid });
      } else {
        const blocks = (data.blocks || []) as StoryBlock[];
        transaction.update(ref, {
          blocks: blocks.map((block) => block.id === input.blockId ? { ...block, media: null } : block),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.uid,
        });
      }
    });
    await adminStorage.bucket().file(input.path).delete({ ignoreNotFound: true }).catch(() => undefined);
    revalidatePath("/", "layout");
    revalidatePath(`/admin/dashboard/${input.collection}`);
    return { ok: true, data: { path: input.path }, message: "Mídia removida." };
  } catch (error) {
    return actionError(error);
  }
}
