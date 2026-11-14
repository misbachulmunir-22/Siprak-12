import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAReSe8o7NaWgyAUe_tCooN6uTLbuVrQ-A",
  authDomain: "siprak-12-sprint-2.firebaseapp.com",
  projectId: "siprak-12-sprint-2",
  storageBucket: "siprak-12-sprint-2.firebasestorage.app",
  messagingSenderId: "772025476114",
  appId: "1:772025476114:web:599161d33c6bfe071a24cb",
  measurementId: "G-VQY71BWHLJ"
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;