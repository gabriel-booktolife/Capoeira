import "server-only";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID || "capoeira-17aee";
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "capoeira-17aee.firebasestorage.app";

const adminApp = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket,
});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export const firebaseProjectId = projectId;
export const firebaseStorageBucket = storageBucket;
