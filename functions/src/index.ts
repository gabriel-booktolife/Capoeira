import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";

setGlobalOptions({maxInstances: 10, region: "us-central1"});
initializeApp();

const SUPER_ADMIN_EMAIL = "chaobatido.paiveio@gmail.com";

function assertSuperAdmin(email?: string | null) {
  if (email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError(
      "permission-denied",
      "Apenas o superadmin pode gerenciar administradores.",
    );
  }
}

function assertPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 8) {
    throw new HttpsError(
      "invalid-argument",
      "A senha temporaria deve ter pelo menos 8 caracteres.",
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
  assertSuperAdmin(request.auth?.token.email);

  const {email, password, displayName} = request.data || {};
  assertEmail(email);
  assertPassword(password);

  const normalizedEmail = email.toLowerCase();
  const user = await getAuth().createUser({
    email: normalizedEmail,
    password,
    displayName:
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim()
        : normalizedEmail,
  });

  await getAuth().setCustomUserClaims(user.uid, {admin: true});
  await getFirestore().collection("admins").doc(user.uid).set({
    uid: user.uid,
    email: normalizedEmail,
    displayName: user.displayName || "",
    active: true,
    role: "admin",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth?.uid || "",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: request.auth?.uid || "",
  });

  return {uid: user.uid, email: normalizedEmail};
});

export const disableAdminUser = onCall(async (request) => {
  assertSuperAdmin(request.auth?.token.email);

  const {uid} = request.data || {};
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "Informe o uid do admin.");
  }

  await getAuth().setCustomUserClaims(uid, {admin: false});
  await getAuth().updateUser(uid, {disabled: true});
  await getFirestore().collection("admins").doc(uid).set(
    {
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid || "",
    },
    {merge: true},
  );

  return {uid, active: false};
});
