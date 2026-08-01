import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export default async function globalSetup() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const app = initializeApp({ projectId: "capoeira-17aee" }, "e2e-seed");
  const auth = getAuth(app);
  const listed = await auth.listUsers();
  if (listed.users.length) await auth.deleteUsers(listed.users.map((user) => user.uid));
  const user = await auth.createUser({ email: "admin.e2e@example.com", password: "senha-segura-e2e", displayName: "Admin E2E", emailVerified: true });
  await auth.setCustomUserClaims(user.uid, { admin: true, superadmin: true });
  await getFirestore(app).collection("settings").doc("public").set({
    schemaVersion: 2, groupName: "Chão Batido", tagline: "Capoeira, cultura e comunidade", heroTitle: "Chão Batido", heroText: "", aboutTitle: "", aboutText: "", contactEmail: "", whatsapp: "", instagramUrl: "", youtubeUrl: "", facebookUrl: "", tiktokUrl: "", seoTitle: "Capoeira Chão Batido", seoDescription: "Chão Batido — Capoeira, cultura e comunidade.", footerText: "Capoeira, cultura e comunidade", heroMedia: null,
  });
  await deleteApp(app);
}
