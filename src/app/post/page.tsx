/*
git add .
git commit -m "update"
git push
*/

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addPost, subscribePosts, updatePostText } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from "../../../firebaseConfig";

type Post = {
  id: string;
  text: string;
  imageUrl?: string;
};

export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newlineEnabled, setNewlineEnabled] = useState(false);
  const [lastAnimatedPostId, setLastAnimatedPostId] = useState<string | null>(null);
  const [lastAnimatedStartIndex, setLastAnimatedStartIndex] = useState<number>(0);

  const isInitialLoad = useRef(true);
  const postAreaRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    const el = postAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function isScrolledToBottom(): boolean {
    const el = postAreaRef.current;
    return el ? el.scrollHeight - el.scrollTop - el.clientHeight < 10 : false;
  }

  useEffect(() => {
    const unsubscribe = subscribePosts((newPosts) => {
      const wasAtBottom = isScrolledToBottom();

      const prevPost = posts[posts.length - 1];
      const newPost = newPosts[newPosts.length - 1];

      setPosts(newPosts);

      requestAnimationFrame(() => {
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          scrollToBottom();
          return;
        }

        if (newPost) {
          if (!prevPost || prevPost.id !== newPost.id) {
            setLastAnimatedPostId(newPost.id);
            setLastAnimatedStartIndex(0);
          } else if (prevPost.text.length < newPost.text.length) {
            setLastAnimatedPostId(newPost.id);
            setLastAnimatedStartIndex(prevPost.text.length);
          }
        }

        if (wasAtBottom) {
          scrollToBottom();
        }
      });
    });

    return () => unsubscribe();
  }, [posts]);

  async function submitPost() {
    const hasText = inputText.trim() !== '';
    const hasImage = !!imageFile;

    // どちらも空なら投稿しない
    if (!hasText && !hasImage) return;

    let imageUrl = '';

    if (hasImage && imageFile) {
      try {
        console.log("📁 画像ファイル準備OK:", imageFile);
        const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
        console.log("✅ 画像アップロード成功:", imageUrl);
      } catch (error) {
        console.error("❌ 画像アップロード失敗:", error);
        return;
      }
    }

    const trimmedText = inputText.trim();

    if (newlineEnabled || posts.length === 0) {
      await addPost({ text: trimmedText, imageUrl });  // 🔽 ←これが重要
      console.log("📝 投稿内容:", { text: trimmedText, imageUrl });
    } else if (hasText) {
      const lastPost = posts[posts.length - 1];
      const newText = lastPost.text + trimmedText;
      await updatePostText(lastPost.id, newText);
    }

    setInputText('');
    setImageFile(null);
  }


  function toggleNewline() {
    setNewlineEnabled((prev) => !prev);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
  }

  function renderPostText(post: Post) {
    const isAnimated = post.id === lastAnimatedPostId;
    const animateFrom = isAnimated ? lastAnimatedStartIndex : post.text?.length ?? 0;
    let globalIndex = 0;

    return (
      <>
        {/* テキストがある場合のみ表示 */}
        {post.text && post.text.trim() !== '' && post.text.split('\n').map((line, lineIndex) => (
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

        {/* 画像がある場合表示 */}
        {post.imageUrl && (
          <div className="flex justify-center my-3">
            <img
              src={post.imageUrl}
              alt="投稿画像"
              className="w-full max-w-md h-auto rounded-xl shadow-md"
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
        <header
          style={{
            padding: '12px 0',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.8rem',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #ccc',
            userSelect: 'none',
            color: '#000',
          }}
        >
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
          <textarea
            id="messageInput"
            rows={1}
            placeholder="write your words."
            style={{
              fontSize: 16,
              padding: '6px 8px',
              lineHeight: 1.5,
              resize: 'none',
              border: '1px solid #ccc',
              borderRadius: 4,
              boxSizing: 'border-box',
              minHeight: 38,
              height: 38,
              color: '#000',
            }}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key.toLowerCase() === 'a' && e.ctrlKey) {
                e.preventDefault();
                toggleNewline();
              } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                submitPost();
              }
            }}
          />

          <input type="file" accept="image/*" onChange={handleImageChange} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleNewline}
              style={{
                fontSize: 20,
                backgroundColor: newlineEnabled ? '#3399ff' : '#ddd',
                color: newlineEnabled ? 'white' : '#333',
                width: 38,
                textAlign: 'center',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                height: 38,
              }}
            >
              ↵
            </button>
            <button
              onClick={submitPost}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                fontSize: 14,
                padding: '0 14px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                height: 38,
              }}
            >
              post
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
