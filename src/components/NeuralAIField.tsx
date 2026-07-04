import React, { useRef, useEffect } from 'react';

interface NeuralAIFieldProps {
  resolvedTheme: 'light' | 'dark';
  isSearching: boolean;
}

export default function NeuralAIField({ resolvedTheme, isSearching }: NeuralAIFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    const particleCount = resolvedTheme === 'dark' ? 38 : 24;

    const colors = resolvedTheme === 'dark' 
      ? ['rgba(139, 92, 246, 0.65)', 'rgba(59, 130, 246, 0.65)', 'rgba(16, 185, 129, 0.55)']
      : ['rgba(139, 92, 246, 0.35)', 'rgba(59, 130, 246, 0.35)', 'rgba(59, 130, 246, 0.25)'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Speed multiplier when search is active to show computational focus
      const speed = isSearching ? 3.5 : 1.0;

      // Update and draw particles
      particles.forEach(p => {
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Keep inside boundary smoothly
        if (p.x < 0) p.x = 0;
        if (p.x > width) p.x = width;
        if (p.y < 0) p.y = 0;
        if (p.y > height) p.y = height;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Draw connections
      const connectionDistance = resolvedTheme === 'dark' ? 105 : 90;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * (resolvedTheme === 'dark' ? 0.25 : 0.15);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = resolvedTheme === 'dark' 
              ? `rgba(139, 92, 246, ${alpha * (isSearching ? 2 : 1)})` 
              : `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = isSearching ? 1.5 : 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [resolvedTheme, isSearching]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl opacity-80">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
}
