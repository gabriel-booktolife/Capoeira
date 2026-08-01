import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = "capoeira-17aee";
const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
const confirmArg = process.argv.find((arg) => arg.startsWith("--confirm="));
const email = emailArg?.slice("--email=".length).trim().toLowerCase();
const confirmation = confirmArg?.slice("--confirm=".length);

if (!email || confirmation !== projectId) {
  throw new Error(
    `Uso: node scripts/bootstrap-superadmin.mjs --email=<email> --confirm=${projectId}`,
  );
}

const app = initializeApp({ credential: applicationDefault(), projectId }, "bootstrap-superadmin");
const auth = getAuth(app);
const db = getFirestore(app);
const user = await auth.getUserByEmail(email);

if (user.disabled) throw new Error("A conta informada está desativada no Firebase Auth.");

const previousClaims = user.customClaims ?? {};
const adminRef = db.collection("admins").doc(user.uid);
const previousAdmin = await adminRef.get();

await auth.setCustomUserClaims(user.uid, {
  ...previousClaims,
  admin: true,
  superadmin: true,
});

try {
  await adminRef.set({
    active: true,
    createdAt: previousAdmin.exists
      ? previousAdmin.data()?.createdAt ?? FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    createdBy: previousAdmin.exists
      ? previousAdmin.data()?.createdBy ?? "bootstrap-superadmin"
      : "bootstrap-superadmin",
    displayName: user.displayName || user.email || "Superadmin",
    email: user.email || email,
    role: "superadmin",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "bootstrap-superadmin",
  }, { merge: true });
} catch (error) {
  await auth.setCustomUserClaims(user.uid, previousClaims);
  throw error;
} finally {
  await deleteApp(app);
}

console.log(`Superadministrador restaurado em ${projectId}: ${email}`);
