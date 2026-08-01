import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";

setGlobalOptions({maxInstances: 10, region: "us-central1"});
initializeApp();

function assertSuperAdmin(request: {auth?: {uid: string; token: Record<string, unknown>}}) {
  if (!request.auth || request.auth.token.superadmin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Apenas o superadmin pode gerenciar administradores.",
    );
  }
}

function assertPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 12) {
    throw new HttpsError(
      "invalid-argument",
      "A senha temporaria deve ter pelo menos 12 caracteres.",
    );
  }
}

function assertEmail(email: unknown): asserts email is string {
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new HttpsError("invalid-argument", "Informe um e-mail valido.");
  }
}

export const createAdminUser = onCall(async (request) => {
  assertSuperAdmin(request);

  const {email, password, displayName} = request.data || {};
  assertEmail(email);
  assertPassword(password);

  const normalizedEmail = email.toLowerCase();
  const user = await getAuth().createUser({email: normalizedEmail, password,
    displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : normalizedEmail});
  try {
    await getAuth().setCustomUserClaims(user.uid, {admin: true, superadmin: false});
    await getFirestore().collection("admins").doc(user.uid).set({
      uid: user.uid, email: normalizedEmail, displayName: user.displayName || "", active: true, role: "admin",
      createdAt: FieldValue.serverTimestamp(), createdBy: request.auth?.uid || "",
      updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth?.uid || "",
    });
  } catch (error) {
    await getAuth().deleteUser(user.uid).catch(() => undefined);
    throw error;
  }

  return {uid: user.uid, email: normalizedEmail};
});

async function updateAdminActive(request: {auth?: {uid: string; token: Record<string, unknown>}; data?: unknown}, forceActive?: boolean) {
  assertSuperAdmin(request);
  const {uid, active: requestedActive} = (request.data || {}) as {uid?: unknown; active?: unknown};
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "Informe o uid do admin.");
  }
  const active = forceActive ?? requestedActive;
  if (typeof active !== "boolean") throw new HttpsError("invalid-argument", "Informe o estado ativo.");
  if (uid === request.auth?.uid && !active) throw new HttpsError("failed-precondition", "Você não pode desativar a própria conta.");
  const target = await getAuth().getUser(uid);
  if (target.customClaims?.superadmin === true && !active) throw new HttpsError("failed-precondition", "A conta superadmin não pode ser desativada por este fluxo.");
  await getAuth().setCustomUserClaims(uid, {...target.customClaims, admin: active});
  await getAuth().updateUser(uid, {disabled: !active});
  await getFirestore().collection("admins").doc(uid).set(
    {
      active,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || "",
    },
    {merge: true},
  );

  await getAuth().revokeRefreshTokens(uid);
  return {uid, active};
}

export const setAdminActive = onCall(async (request) => updateAdminActive(request));

// Compatibilidade temporária com clientes antigos.
export const disableAdminUser = onCall(async (request) => {
  return updateAdminActive(request, false);
});
