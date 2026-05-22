import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCljcg9eyQP8Ieeerj4ETB-DYj5K0YVCQA",
  authDomain: "capoeira-17aee.firebaseapp.com",
  projectId: "capoeira-17aee",
  storageBucket: "capoeira-17aee.firebasestorage.app",
  messagingSenderId: "201698844724",
  appId: "1:201698844724:web:0fcaa83263a5740e68aa61",
  measurementId: "G-6V6C4G0WF9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null,
);
