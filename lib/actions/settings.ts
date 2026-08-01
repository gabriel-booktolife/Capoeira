"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { siteSettingsSchema } from "@/lib/content/schema";
import type { SiteSettings } from "@/lib/content/types";
import { adminDb } from "@/lib/firebase/admin";
import { pruneUndefined, serializeFirestore } from "@/lib/firebase/serialize";
import { actionError, type ActionResult } from "./shared";

export async function saveSettingsAction(input: unknown): Promise<ActionResult<SiteSettings>> {
  try {
    const session = await requireAdmin();
    const parsed = siteSettingsSchema.parse(input);
    const ref = adminDb.collection("settings").doc("public");
    await ref.set(pruneUndefined({
      ...parsed,
      schemaVersion: 2,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    }), { merge: true });
    const saved = await ref.get();
    revalidatePath("/", "layout");
    revalidatePath("/admin/dashboard/configuracoes");
    return { ok: true, data: { id: "public", ...serializeFirestore(saved.data() || {}) } as SiteSettings, message: "Configurações atualizadas." };
  } catch (error) {
    return actionError(error);
  }
}
