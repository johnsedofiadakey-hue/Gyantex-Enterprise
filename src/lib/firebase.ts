import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC9yolQ8pFOneRlCK_2yAdZrs8kAbnyBOQ",
  authDomain: "gyantexenterpr1se.firebaseapp.com",
  projectId: "gyantexenterpr1se",
  storageBucket: "gyantexenterpr1se.firebasestorage.app",
  messagingSenderId: "65524429133",
  appId: "1:65524429133:web:78bff42a3409d8b9d98704"
};

// Initialize Firebase (ensure it's only initialized once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, db, auth, storage, functions };
