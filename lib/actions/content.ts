"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { sectionByCollection } from "@/lib/content/config";
import { parseContent } from "@/lib/content/schema";
import type { AnyContent, ContentCollection, ContentStatus } from "@/lib/content/types";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { pruneUndefined, serializeFirestore } from "@/lib/firebase/serialize";
import { actionError, type ActionResult } from "./shared";

function revalidateContent(collection: ContentCollection) {
  revalidatePath("/");
  revalidatePath(sectionByCollection[collection].publicPath);
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/dashboard/${collection}`);
}

async function uniqueSlug(collection: ContentCollection, candidate: string, id: string) {
  const fallback = `${sectionByCollection[collection].kind}-${id.slice(0, 7)}`;
  const base = candidate || fallback;
  const snapshot = await adminDb.collection(collection).where("slug", "==", base).limit(2).get();
  return snapshot.docs.some((item) => item.id !== id) ? `${base}-${id.slice(0, 5)}` : base;
}

export async function saveContentAction(
  collection: ContentCollection,
  id: string | null,
  input: unknown,
  status: Exclude<ContentStatus, "deleting">,
): Promise<ActionResult<AnyContent>> {
  try {
    const session = await requireAdmin();
    const config = sectionByCollection[collection];
    if (!config) throw new Error("Seção inválida.");
    const parsed = parseContent(config.kind, input, status);
    const ref = id ? adminDb.collection(collection).doc(id) : adminDb.collection(collection).doc();
    const current = await ref.get();
    if (current.data()?.status === "deleting") throw new Error("Este conteúdo está em processo de exclusão.");
    const slug = await uniqueSlug(collection, String(parsed.slug || ""), ref.id);
    const nowFields = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };
    const payload = pruneUndefined({
      ...parsed,
      slug,
      schemaVersion: 2,
      ...nowFields,
      ...(status === "published" && !current.data()?.publishedAt
        ? { publishedAt: FieldValue.serverTimestamp() }
        : {}),
      ...(!current.exists
        ? {
            createdAt: FieldValue.serverTimestamp(),
            createdBy: session.uid,
          }
        : {}),
    });
    await ref.set(payload, { merge: current.exists });
    const saved = await ref.get();
    revalidateContent(collection);
    return {
      ok: true,
      data: serializeFirestore({ id: saved.id, ...saved.data() }) as AnyContent,
      message: status === "published" ? "Conteúdo publicado." : "Rascunho salvo.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteContentAction(
  collection: ContentCollection,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const ref = adminDb.collection(collection).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return { ok: true, data: { id }, message: "Conteúdo já removido." };
    await ref.update({
      status: "deleting",
      deletionStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    });
    await adminStorage.bucket().deleteFiles({ prefix: `${collection}/${id}/`, force: true });
    await ref.delete();
    revalidateContent(collection);
    return { ok: true, data: { id }, message: "Conteúdo e mídias removidos definitivamente." };
  } catch (error) {
    revalidateContent(collection);
    return actionError(error);
  }
}
