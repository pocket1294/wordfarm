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

export { db };

export type Post = {
  id: string;
  text: string;
  imageUrl?: string;
};

// 🔸 投稿を新規追加（画像付き対応）
export async function addPost({
  text,
  imageUrl,
}: {
  text: string;
  imageUrl?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, "posts"), {
      text,
      imageUrl: imageUrl || '',
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("投稿エラー: ", error);
  }
}

// 🔸 投稿をリアルタイムで購読（画像あり対応）
export function subscribePosts(callback: (posts: Post[]) => void) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const posts: Post[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (typeof data.text === "string") {
        posts.push({
          id: doc.id,
          text: data.text,
          imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
        });
      }
    });
    callback(posts);
  });
}

// 🔸 既存投稿の text フィールドを更新（追記用）
export async function updatePostText(id: string, newText: string) {
  try {
    const postRef = doc(db, "posts", id);
    await updateDoc(postRef, { text: newText });
  } catch (error) {
    console.error("投稿更新エラー: ", error);
  }
}
