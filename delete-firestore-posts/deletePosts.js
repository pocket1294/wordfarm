//node deletePosts.js
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// 🔧 あなたの Firebase 設定に書き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyDETV9Dil2YT0VAJXuHv0_AhVcAWLEnELg",
  authDomain: "word-farm-be1d3.firebaseapp.com",
  projectId: "word-farm-be1d3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllPosts() {
  const snapshot = await getDocs(collection(db, 'posts'));
  const deletions = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, 'posts', docSnap.id))
  );
  await Promise.all(deletions);
  console.log(`✅ ${deletions.length} posts deleted.`);
}

deleteAllPosts().catch((err) => console.error('❌ Error deleting posts:', err));

