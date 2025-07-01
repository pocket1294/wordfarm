// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentData,
  doc,
  updateDoc,
} from "firebase/firestore";

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

const app = getFirebaseApp();
const db = getFirestore(app);

// 投稿を新規追加
export async function addPost(text: string) {
  try {
    await addDoc(collection(db, "posts"), {
      text,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("投稿エラー: ", error);
  }
}

// 投稿をリアルタイムで購読
export function subscribePosts(
  callback: (posts: { id: string; text: string }[]) => void
) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const posts: { id: string; text: string }[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (typeof data.text === "string") {
        posts.push({ id: doc.id, text: data.text });
      }
    });
    callback(posts);
  });
}

// 既存投稿の text フィールドを更新（追記用）
export async function updatePostText(id: string, newText: string) {
  try {
    const postRef = doc(db, "posts", id);
    await updateDoc(postRef, { text: newText });
  } catch (error) {
    console.error("投稿更新エラー: ", error);
  }
}
