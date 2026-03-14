import { useEffect, useRef } from 'react';

export function useCursorGlow() {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Skip on touch devices — no mouse cursor, saves GPU and battery
    const isTouch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.opacity = '0';
    document.body.appendChild(glow);
    glowRef.current = glow;

    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const animate = () => {
      currentX = lerp(currentX, targetX, 0.15);
      currentY = lerp(currentY, targetY, 0.15);
      glow.style.left = `${currentX}px`;
      glow.style.top = `${currentY}px`;
      rafId = requestAnimationFrame(animate);
    };

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      glow.style.opacity = '1';
    };

    const handleLeave = () => {
      glow.style.opacity = '0';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(rafId);
      glow.remove();
    };
  }, []);
}
