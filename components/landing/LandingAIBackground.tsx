"use client";

import { useEffect, useRef } from "react";

const PURPLE = { r: 139, g: 92, b: 246 };
const CYAN = { r: 34, g: 211, b: 238 };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: "purple" | "cyan";
};

function particleCount(width: number): number {
  if (width < 640) return 36;
  if (width < 1024) return 52;
  return 68;
}

export function LandingAIBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = particleCount(width);
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.2 + 0.8,
        hue: i % 3 === 0 ? "cyan" : "purple",
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, active: false };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const { x: mx, y: my, active } = mouseRef.current;
      const connectDist = width < 640 ? 110 : 140;
      const mouseRadius = 180;

      for (const p of particles) {
        if (!reducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          if (active) {
            const dx = mx - p.x;
            const dy = my - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist < mouseRadius && dist > 1) {
              const force = (1 - dist / mouseRadius) * 0.018;
              p.vx += (dx / dist) * force;
              p.vy += (dy / dist) * force;
            }
          }

          p.vx *= 0.992;
          p.vy *= 0.992;
        }

        const color = p.hue === "cyan" ? CYAN : PURPLE;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},0.55)`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > connectDist) continue;

          const alpha = (1 - dist / connectDist) * 0.22;
          const midNearMouse =
            active &&
            Math.hypot(mx - (a.x + b.x) / 2, my - (a.y + b.y) / 2) <
              mouseRadius * 0.85;
          const lineAlpha = midNearMouse ? alpha * 1.6 : alpha;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${PURPLE.r},${PURPLE.g},${PURPLE.b},${lineAlpha})`;
          ctx.lineWidth = midNearMouse ? 1.1 : 0.6;
          ctx.stroke();
        }
      }

      if (active && !reducedMotion) {
        const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 220);
        glow.addColorStop(0, "rgba(139,92,246,0.14)");
        glow.addColorStop(0.45, "rgba(34,211,238,0.06)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(mx - 220, my - 220, 440, 440);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    frameRef.current = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameRef.current);
      } else {
        frameRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden
    />
  );
}
