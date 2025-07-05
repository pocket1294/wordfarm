'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addPost, subscribePosts } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../../firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

type Post = {
  id: string;
  text: string;
  imageUrl?: string;
};

export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lastAnimatedPostId, setLastAnimatedPostId] = useState<string | null>(null);
  const [lastAnimatedStartIndex, setLastAnimatedStartIndex] = useState<number>(0);
  const postsRef = useRef<Post[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth)
          .then(() => console.log('🔐 匿名ログイン完了'))
          .catch((err) => console.error('❌ 匿名ログイン失敗:', err));
      } else {
        console.log('✅ ログイン中 UID:', user.uid);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePosts((newPosts) => {
      const prevPost = postsRef.current[postsRef.current.length - 1];
      const newPost = newPosts[newPosts.length - 1];

      setPosts(newPosts);
      postsRef.current = newPosts;

      if (newPost) {
        if (!prevPost || prevPost.id !== newPost.id) {
          setLastAnimatedPostId(newPost.id);
          setLastAnimatedStartIndex(0);
        } else if (prevPost.text.length < newPost.text.length) {
          setLastAnimatedPostId(newPost.id);
          setLastAnimatedStartIndex(prevPost.text.length);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  async function submitPost(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const hasText = inputText.trim() !== '';
    const hasImage = !!imageFile;
    if (!hasText && !hasImage) return;

    let imageUrl = '';
    if (hasImage && imageFile) {
      try {
        const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
        const uploadTask = uploadBytesResumable(imageRef, imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            () => resolve(null)
          );
        });

        imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
      } catch (error) {
        console.error('❌ 画像アップロード失敗:', error);
        return;
      }
    }

    await addPost({ text: inputText.trim(), imageUrl });

    setInputText('');
    setImageFile(null);
    setFileName(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 0) {
      setImageFile(file);
      setFileName(file.name);
    } else {
      setImageFile(null);
      setFileName(null);
    }
  }

  function renderPostText(post: Post) {
    const isAnimated = post.id === lastAnimatedPostId;
    const animateFrom = isAnimated ? lastAnimatedStartIndex : post.text?.length ?? 0;
    let globalIndex = 0;

    return (
      <>
        {post.text?.trim() && post.text.split('\n').map((line, lineIndex) => (
          <div key={lineIndex} style={{ lineHeight: '1.5', margin: 0 }}>
            {[...line].map((char, i) => {
              const animate = globalIndex >= animateFrom;
              const style = animate
                ? { animationDelay: `${(globalIndex - animateFrom) * 0.05}s`, opacity: 0 }
                : { opacity: 1 };
              const className = animate ? 'letter' : '';
              globalIndex++;
              return (
                <span key={`${lineIndex}-${i}`} className={className} style={style}>
                  {char}
                </span>
              );
            })}
          </div>
        ))}
        {post.imageUrl && (
          <div className="flex justify-center my-3">
            <img
              src={post.imageUrl}
              alt="投稿画像"
              className="w-full max-w-[170px] h-auto rounded-xl shadow-md"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <style>{`
        .letter {
          animation: fadeIn 1.5s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '12px 0',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.8rem',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #ccc',
          userSelect: 'none',
          color: '#000'
        }}>
          Word Farm
        </header>

        <div
          id="postArea"
          style={{
            flex: 1,
            padding: 16,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            background: '#fff',
            color: '#000',
          }}
        >
          {posts.map((post) => (
            <div key={post.id} style={{ margin: '8px 0' }}>
              {renderPostText(post)}
            </div>
          ))}
        </div>

        <form onSubmit={submitPost}>
          <div
            id="formContainer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 8,
              borderTop: '1px solid #ccc',
              background: '#fafafa',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                id="messageInput"
                rows={1}
                placeholder="write your words."
                style={{
                  flex: 1,
                  fontSize: 16,
                  padding: '6px 8px',
                  lineHeight: 1.5,
                  resize: 'none',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  minHeight: 38,
                  maxWidth: '100%',
                  color: '#000'
                }}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  fontSize: 14,
                  padding: '0 16px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 4,
                  height: 38,
                  whiteSpace: 'nowrap',
                }}
              >
                post
              </button>
            </div>

            <input
              id="imageInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {fileName && (
              <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0 0' }}>
                選択されたファイル: {fileName}
              </p>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
