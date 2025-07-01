'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  totalTextLength: number;
};

export default function TreeCanvas({ totalTextLength }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  function lerpColor(color1: [number, number, number], color2: [number, number, number], t: number): string {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    return `rgba(${r},${g},${b},0.4)`; // ← 透明度0.15で文字が隠れない
  }

  function drawBranch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    angle: number,
    depth: number,
    maxDepth: number
  ) {
    if (depth === 0) return;

    const x2 = x + length * Math.sin(angle);
    const y2 = y - length * Math.cos(angle);

    const t = (maxDepth - depth) / maxDepth;

    // 淡い茶→淡い緑（ベージュ〜ミント系）
    const color = lerpColor([160, 130, 100], [144, 238, 144], t);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    drawBranch(ctx, x2, y2, length * 0.9, angle - 0.4, depth - 1, maxDepth);
    drawBranch(ctx, x2, y2, length * 0.9, angle + 0.4, depth - 1, maxDepth);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight - 120);

    ctx.lineWidth = 1;

    const finalDepth = 12;
    let currentDepth = 1;
    const interval = 30;
    let lastTime = performance.now();

    function animate(time: number) {
      if (time - lastTime >= interval) {
        ctx.clearRect(0, 0, width, height);
        drawBranch(ctx, width / 2, height, 30, 0, currentDepth, finalDepth);
        lastTime = time;
        currentDepth++;
      }

      if (currentDepth <= finalDepth) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [totalTextLength]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        zIndex: 0,
        width: '100vw',
        height: 'calc(100vh - 115px)',
        pointerEvents: 'none',
      }}
    />
  );
}
