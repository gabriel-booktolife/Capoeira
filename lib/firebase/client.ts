"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCljcg9eyQP8Ieeerj4ETB-DYj5K0YVCQA",
  authDomain: "capoeira-17aee.firebaseapp.com",
  projectId: "capoeira-17aee",
  storageBucket: "capoeira-17aee.firebasestorage.app",
  messagingSenderId: "201698844724",
  appId: "1:201698844724:web:0fcaa83263a5740e68aa61",
  measurementId: "G-6V6C4G0WF9",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp, "us-central1");

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "1") {
  try { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); } catch { /* já conectado no hot reload */ }
  try { connectStorageEmulator(storage, "127.0.0.1", 9199); } catch { /* já conectado no hot reload */ }
  try { connectFunctionsEmulator(functions, "127.0.0.1", 5001); } catch { /* já conectado no hot reload */ }
}
