import { useEffect } from 'react';

// Hace que el recetario 3D gire lento solo y además siga al mouse.
// Escribe las variables --mx y --my en el elemento, y el CSS del libro las usa.
export function useBookTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let tx = 0; let ty = 0; let x = 0; let y = 0; let frame;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const leave = () => { tx = 0; ty = 0; };
    const t0 = performance.now();
    const loop = (now) => {
      const t = now - t0;
      const touch = window.matchMedia('(hover: none)').matches;
      const swayX = Math.sin(t / 3200) * 0.8;
      const swayY = Math.cos(t / 4100) * 0.3;
      const gx = touch ? swayX : swayX * 0.6 + tx * 0.6;
      const gy = touch ? swayY : swayY * 0.6 + ty * 0.6;
      x += (gx - x) * 0.07; y += (gy - y) * 0.07;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
      frame = requestAnimationFrame(loop);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
}
