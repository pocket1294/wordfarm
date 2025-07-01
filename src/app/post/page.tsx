'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addPost, subscribePosts, updatePostText } from '@/lib/firebase';
import TreeCanvas from '@/components/TreeCanvas';

type Post = {
  id: string;
  text: string;
};

export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState('');
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
      const el = postAreaRef.current;
      const wasAtBottom = isScrolledToBottom();
      const prevScrollHeight = el?.scrollHeight || 0;

      const prevPost = posts[posts.length - 1];
      const newPost = newPosts[newPosts.length - 1];

      setPosts(newPosts);

      requestAnimationFrame(() => {
        const nowScrollHeight = el?.scrollHeight || 0;
        const hasNewLine = nowScrollHeight > prevScrollHeight;

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

        if (wasAtBottom && hasNewLine) {
          scrollToBottom();
        }
      });
    });

    return () => unsubscribe();
  }, [posts]);

  async function submitPost() {
    if (inputText.trim() === '') return;

    if (newlineEnabled || posts.length === 0) {
      await addPost(inputText);
    } else {
      const lastPost = posts[posts.length - 1];
      const newText = lastPost.text + inputText;
      await updatePostText(lastPost.id, newText);
    }

    setInputText('');
  }

  function toggleNewline() {
    setNewlineEnabled((prev) => !prev);
  }

  function renderPostText(post: Post) {
    const isAnimated = post.id === lastAnimatedPostId;
    const animateFrom = isAnimated ? lastAnimatedStartIndex : post.text.length;
    let globalIndex = 0;

    return post.text.split('\n').map((line, lineIndex) => (
      <div key={lineIndex} style={{ lineHeight: '1.5', margin: 0 }}>
        {[...line].map((char, i) => {
          const animate = globalIndex >= animateFrom;
          const style = {
            ...(animate && {
              animationDelay: `${(globalIndex - animateFrom) * 0.05}s`,
              opacity: 0,
            }),
            ...(!animate && {
              opacity: 1,
            }),
          };
          const className = animate ? 'letter' : '';
          globalIndex++;

          return (
            <span key={`${lineIndex}-${i}`} className={className} style={style}>
              {char}
            </span>
          );
        })}
      </div>
    ));
  }

  const totalTextLength = posts.reduce((sum, post) => sum + post.text.length, 0);

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

      <TreeCanvas totalTextLength={totalTextLength} />

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            padding: '12px 0',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.8rem',
            backgroundColor: 'transparent',
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
            background: 'transparent', // ← 修正ポイント
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
            padding: 8,
            borderTop: '1px solid #ccc',
            background: 'transparent', // ← 修正ポイント
            alignItems: 'center',
          }}
        >
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
          <button
            onClick={toggleNewline}
            style={{
              fontSize: 20,
              backgroundColor: newlineEnabled ? '#3399ff' : '#ddd',
              color: newlineEnabled ? 'white' : '#333',
              width: 38,
              textAlign: 'center',
              marginLeft: 0,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 4,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 'normal',
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
              marginLeft: 8,
              padding: '0 14px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 4,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 'normal',
            }}
          >
            post
          </button>
        </div>
      </div>
    </>
  );
}
