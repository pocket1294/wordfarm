// src/lib/auth.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  User,
  Auth,
} from "firebase/auth";

let auth: Auth | null = null;

const firebaseConfig = {
  apiKey: "AIzaSyDETV9Dil2YT0VAJXuHv0_AhVcAWLEnELg",
  authDomain: "word-farm-be1d3.firebaseapp.com",
  projectId: "word-farm-be1d3",
  storageBucket: "word-farm-be1d3.firebasestorage.app",
  messagingSenderId: "392671676264",
  appId: "1:392671676264:web:9864084ab0e5726619b8dd",
};

function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function initAuth() {
  const app = getFirebaseApp();
  auth = getAuth(app);

  if (!auth) return; // 念のため保険

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("ユーザー認証済み UID:", user.uid);
    } else {
      // ここも auth が null じゃないと明示
      signInAnonymously(auth!)
        .then(() => {
          console.log("匿名ログイン成功");
        })
        .catch((error) => {
          console.error("匿名ログインエラー:", error);
        });
    }
  });
}

export function getCurrentUser(): User | null {
  return auth ? auth.currentUser : null;
}
