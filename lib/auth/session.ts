import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "chao_batido_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export type AdminSession = DecodedIdToken & {
  admin?: boolean;
  superadmin?: boolean;
};

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true) as AdminSession;
    return decoded.admin === true || decoded.superadmin === true ? decoded : null;
  } catch {
    return null;
  }
});

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.superadmin !== true) throw new Error("Apenas o superadministrador pode realizar esta ação.");
  return session;
}
