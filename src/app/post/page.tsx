'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addPost, subscribePosts, deletePost } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../../firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import * as linkify from 'linkifyjs';

type Post = {
  id: string;
  text: string;
  imageUrl?: string;
  uid?: string;
};

export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isUploading, setIsUploading] = useState(false); 
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lastAnimatedPostId, setLastAnimatedPostId] = useState<string | null>(null);
  const [lastAnimatedStartIndex, setLastAnimatedStartIndex] = useState<number>(0);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const postsRef = useRef<Post[]>([]);
  const postAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth)
          .then((result) => {
            setCurrentUid(result.user.uid);
          })
          .catch((err) => console.error('匿名ログイン失敗:', err));
      } else {
        setCurrentUid(user.uid);
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

      const postArea = postAreaRef.current;
      const isAtBottom = postArea && postArea.scrollTop + postArea.clientHeight >= postArea.scrollHeight - 20;

      if (newPost) {
        if (!prevPost || prevPost.id !== newPost.id) {
          setLastAnimatedPostId(newPost.id);
          setLastAnimatedStartIndex(0);
        } else if (prevPost.text.length < newPost.text.length) {
          setLastAnimatedPostId(newPost.id);
          setLastAnimatedStartIndex(prevPost.text.length);
        }
      }

      if (postArea && isAtBottom) {
        setTimeout(() => {
          postArea.scrollTop = postArea.scrollHeight;
        }, 100);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const postArea = postAreaRef.current;
    if (postArea) {
      postArea.scrollTop = postArea.scrollHeight;
    }
  }, []);

  async function submitPost(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (isUploading) return; // ← 多重送信防止

    const hasText = inputText.trim() !== '';
    const hasImage = !!imageFile;
    if (!hasText && !hasImage) return;

    setIsUploading(true); 
    
    let imageUrl = '';
    if (hasImage && imageFile) {
      try {
        setIsUploading(true); // ← アップロード開始
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
        setIsUploading(false);
        return;
      }
    }

    await addPost({ text: inputText.trim(), imageUrl, uid: currentUid ?? '' });

    setInputText('');
    setImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setIsUploading(false); // ← 終了
  }


  function renderAnimatedTextWithLinks(text: string, animateFrom: number) {
    const matches = linkify.find(text);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let globalIndex = 0;

    matches.forEach((match, i) => {
      const { start, end, value, href } = match;

      const before = text.slice(lastIndex, start);
      [...before].forEach((char) => {
        const animate = globalIndex >= animateFrom;
        elements.push(
          <span
            key={`t-${i}-${globalIndex}`}
            className={animate ? 'letter' : ''}
            style={animate ? { animationDelay: `${(globalIndex - animateFrom) * 0.05}s`, opacity: 0 } : { opacity: 1 }}
          >
            {char}
          </span>
        );
        globalIndex++;
      });

      elements.push(
        <a
          key={`a-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="auto-link"
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          {value}
        </a>
      );
      globalIndex += value.length;
      lastIndex = end;
    });

    const rest = text.slice(lastIndex);
    [...rest].forEach((char) => {
      const animate = globalIndex >= animateFrom;
      elements.push(
        <span
          key={`r-${globalIndex}`}
          className={animate ? 'letter' : ''}
          style={animate ? { animationDelay: `${(globalIndex - animateFrom) * 0.05}s`, opacity: 0 } : { opacity: 1 }}
        >
          {char}
        </span>
      );
      globalIndex++;
    });

    return elements;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file || file.size === 0) {
      setImageFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newFile = new File([reader.result as ArrayBuffer], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      });
      setImageFile(newFile);
    };
    reader.readAsArrayBuffer(file);
  }

  function renderPostText(post: Post) {
    const isAnimated = post.id === lastAnimatedPostId;
    const animateFrom = isAnimated ? lastAnimatedStartIndex : post.text?.length ?? 0;

    return (
      <div onClick={() => setSelectedPostId(prev => prev === post.id ? null : post.id)}>
        {post.text?.trim() && post.text.split('\n').map((line, lineIndex) => (
          <div key={lineIndex} style={{ lineHeight: '1.5', margin: 0 }}>
            {renderAnimatedTextWithLinks(line, animateFrom)}
          </div>
        ))}
        {post.imageUrl && (
          <div className="flex justify-center my-3">
            <img
              src={post.imageUrl}
              alt="投稿画像"
              className="w-full max-w-[170px] h-auto rounded-xl shadow-md"
              onLoad={() => {
                const postArea = postAreaRef.current;
                if (postArea) postArea.scrollTop = postArea.scrollHeight;
              }}
            />
          </div>
        )}
        {post.uid === currentUid && selectedPostId === post.id && (
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => deletePost(post.id)}
              style={{ color: 'red', fontSize: 12 }}
            >
              この投稿を削除
            </button>
          </div>
        )}
      </div>
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
          ref={postAreaRef}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitPost();
                  }
                }}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  background: '#eee',
                  cursor: 'pointer'
                }}
              >
                Select an Image
              </button>
              <span style={{ fontSize: 12, color: '#555', wordBreak: 'break-all' }}>
                {imageFile ? imageFile.name || '📷 選択済み（ファイル名なし）' : ''}
              </span>

            </div>

            <input
              id="imageInput"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
              capture={undefined}
            />
            <div style={{ fontSize: 12, color: '#555' }}>
              {isUploading ? 'Uploading...' : imageFile?.name || '選択されていません'}
            </div>

          </div>
        </form>
      </div>
    </>
  );
}
