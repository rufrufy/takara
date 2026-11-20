import React, { useEffect, useRef } from 'react';

const SPARK_COLORS = ['#FFD166', '#06D6A0', '#FF6B6B', '#38BDF8', '#C4B5FD'];
const MAX_BURSTS = 10;

export const TouchSparkLayer: React.FC = () => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const handlePointerDown = (e: PointerEvent) => {
      const container = layerRef.current;
      if (!container) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;

      while (container.childElementCount >= MAX_BURSTS && container.firstElementChild) {
        container.removeChild(container.firstElementChild);
      }

      const burst = document.createElement('div');
      burst.className = 'touch-spark-burst';
      burst.style.left = `${e.clientX}px`;
      burst.style.top = `${e.clientY}px`;

      const ring = document.createElement('span');
      ring.className = 'touch-spark-ring';
      burst.appendChild(ring);

      const baseAngle = Math.random() * 36;
      for (let i = 0; i < 5; i++) {
        const dot = document.createElement('span');
        const angle = ((baseAngle + i * 72 + (Math.random() * 20 - 10)) * Math.PI) / 180;
        const dist = 24 + Math.random() * 18;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const shapeClass = i % 3 === 1 ? ' is-square' : i % 3 === 2 ? ' is-diamond' : '';

        dot.className = `touch-spark-dot${shapeClass}`;
        dot.style.backgroundColor = SPARK_COLORS[i % SPARK_COLORS.length]!;
        dot.style.setProperty('--tx', `${tx.toFixed(1)}px`);
        dot.style.setProperty('--ty', `${ty.toFixed(1)}px`);
        dot.style.setProperty('--rot', `${Math.round(Math.random() * 160 - 80)}deg`);
        burst.appendChild(dot);
      }

      container.appendChild(burst);

      const timer = setTimeout(() => {
        timers.delete(timer);
        if (burst.parentNode === container) {
          container.removeChild(burst);
        }
      }, 480);
      timers.add(timer);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return <div ref={layerRef} className="touch-spark-layer" aria-hidden="true" />;
};
