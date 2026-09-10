'use client';

import React, { useEffect, useRef } from 'react';
import { GameState } from '@/types/game';

interface GameCanvasProps {
  gameState: GameState;
  currentMultiplier: number;
  crashMultiplier: number;
  waitingCountdown: number; // 0 to 4 seconds
  maxWaitingCountdown?: number;
  flightDuration: number; // seconds
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  currentMultiplier,
  crashMultiplier,
  waitingCountdown,
  maxWaitingCountdown = 4.0,
  flightDuration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const planePosRef = useRef<{ x: number; y: number; angle: number }>({ x: 60, y: 300, angle: -0.3 });
  const crashAnimRef = useRef<{ active: boolean; planeX: number; planeY: number; vx: number; vy: number; alpha: number }>({
    active: false,
    planeX: 0,
    planeY: 0,
    vx: 12,
    vy: -8,
    alpha: 1,
  });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // When crash happens, initialize crash animation burst
  useEffect(() => {
    if (gameState === 'CRASHED') {
      crashAnimRef.current = {
        active: true,
        planeX: planePosRef.current.x,
        planeY: planePosRef.current.y,
        vx: 18,
        vy: -14,
        alpha: 1,
      };
      // Spawn crash burst particles
      const colors = ['#38bdf8', '#60a5fa', '#93c5fd', '#ef4444', '#f87171'];
      for (let i = 0; i < 35; i++) {
        const speed = 2 + Math.random() * 7;
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
          x: planePosRef.current.x,
          y: planePosRef.current.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    } else if (gameState === 'FLYING') {
      crashAnimRef.current.active = false;
    }
  }, [gameState]);

  // Main Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Blue gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#040b17');
      bgGrad.addColorStop(0.5, '#08162d');
      bgGrad.addColorStop(1, '#050f20');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial blue glow in center-right
      const radialGlow = ctx.createRadialGradient(
        width * 0.65,
        height * 0.45,
        20,
        width * 0.65,
        height * 0.45,
        Math.max(width, height) * 0.7
      );
      radialGlow.addColorStop(0, 'rgba(14, 165, 233, 0.12)');
      radialGlow.addColorStop(0.6, 'rgba(30, 58, 138, 0.08)');
      radialGlow.addColorStop(1, 'rgba(4, 11, 23, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Flight Grid & Altitude Lines
      drawGrid(ctx, width, height, currentMultiplier);

      // 3. Render based on GameState
      if (gameState === 'FLYING' || gameState === 'CRASHED') {
        drawFlightCurveAndPlane(ctx, width, height);
      } else if (gameState === 'WAITING' || gameState === 'STARTING') {
        drawIdlePlaneOnRunway(ctx, width, height);
      }

      // 4. Update & Draw Particles (engine jet sparks)
      updateAndDrawParticles(ctx);

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, mult: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;

      // Vertical radar grid lines
      const vCols = 6;
      for (let i = 1; i < vCols; i++) {
        const x = (w / vCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 35);
        ctx.stroke();
      }

      // Horizontal altitude lines with multiplier labels on left
      const hRows = 5;
      const startX = 45;
      const endX = w - 20;

      // Dynamic scales: as multiplier increases, scale labels
      const maxVisualMult = Math.max(5, Math.ceil(mult * 1.3));
      for (let i = 0; i <= hRows; i++) {
        const y = (h - 50) - ((h - 90) / hRows) * i;
        const rowVal = 1 + ((maxVisualMult - 1) / hRows) * i;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();

        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.textAlign = 'right';
        ctx.fillText(`${rowVal.toFixed(1)}x`, startX - 8, y + 4);
      }

      // Baseline bottom axis
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.moveTo(startX, h - 50);
      ctx.lineTo(endX, h - 50);
      ctx.stroke();

      ctx.restore();
    };

    const drawFlightCurveAndPlane = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const startX = 45;
      const startY = h - 50;
      const originX = startX + 28;
      const originY = startY - 16;

      const maxScreenX = Math.max(originX + 80, w - 75);
      const availableWidth = maxScreenX - originX;

      // Horizontal flight progress: travels across screen over ~12 seconds
      const travelSpeed = availableWidth / 12;
      const virtualX = originX + flightDuration * travelSpeed;

      // Camera offset when plane reaches the right side (continuous smooth ticker flow)
      const offsetX = virtualX > maxScreenX ? virtualX - maxScreenX : 0;
      const planeScreenX = Math.min(maxScreenX, virtualX);

      // Number of trajectory points for silky-smooth waveform
      const numPoints = Math.max(16, Math.floor((planeScreenX - originX) / 8));
      const points: { x: number; y: number }[] = [];

      // Adaptive wavelength for consistent, rhythmic up and down cycles
      const wavelength = Math.max(85, Math.min(115, availableWidth / 4.5));

      // Multiplier progress for baseline ascent
      const multClimb = Math.min(1, Math.log(Math.max(1, currentMultiplier)) / Math.log(20));

      for (let i = 0; i <= numPoints; i++) {
        const u = i / numPoints;
        const screenX = originX + (planeScreenX - originX) * u;
        const trueX = screenX + offsetX;
        const dist = trueX - originX;

        // Steady baseline climb linked to spatial progress and multiplier
        const climbRatio = Math.min(1, dist / (availableWidth * 1.6));
        const baseRise = (originY - 80) * (0.05 + 0.95 * Math.max(climbRatio * 0.8, multClimb * u));
        const baselineY = originY - baseRise;

        // Constant, rhythmic graph wave (subindo e descendo de forma constante como um gráfico)
        const wavePhase = (dist / wavelength) * Math.PI * 2;
        // Smooth ramp from takeoff pad so launch is seamless
        const ramp = Math.min(1, dist / 45);
        const waveAmplitude = 20 * ramp;
        const wave = Math.sin(wavePhase) * waveAmplitude;

        const ptY = Math.max(55, Math.min(startY - 12, baselineY - wave));
        points.push({ x: screenX, y: ptY });
      }

      if (points.length < 2) {
        points.push({ x: originX + 2, y: originY });
      }

      const lastPt = points[points.length - 1];

      // Draw glowing blue area under curve
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, startY);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(lastPt.x, lastPt.y);
      ctx.lineTo(lastPt.x, startY);
      ctx.closePath();

      const minY = Math.min(...points.map((p) => p.y));
      const areaGrad = ctx.createLinearGradient(0, minY, 0, startY);
      areaGrad.addColorStop(0, 'rgba(14, 165, 233, 0.32)');
      areaGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.15)');
      areaGrad.addColorStop(1, 'rgba(30, 58, 138, 0.02)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Draw sharp stroke curve with neon blue gradient
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(lastPt.x, lastPt.y);

      const strokeGrad = ctx.createLinearGradient(points[0].x, startY, lastPt.x, lastPt.y);
      strokeGrad.addColorStop(0, '#1e40af');
      strokeGrad.addColorStop(0.35, '#2563eb');
      strokeGrad.addColorStop(0.75, '#0ea5e9');
      strokeGrad.addColorStop(1, '#38bdf8');

      ctx.strokeStyle = strokeGrad;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      // Calculate tangent angle for airplane orientation so it tilts up on ascent and down on descent
      const samplePrev = points[Math.max(0, points.length - 3)];
      const dx = lastPt.x - samplePrev.x;
      const dy = lastPt.y - samplePrev.y;
      const angle = Math.atan2(dy, Math.max(0.1, dx));

      // Save position for particles / crash
      planePosRef.current = { x: lastPt.x, y: lastPt.y, angle };

      if (gameState === 'FLYING') {
        // Emit engine particles
        if (Math.random() > 0.15) {
          const pAngle = angle + Math.PI + (Math.random() - 0.5) * 0.4;
          const pSpeed = 1.5 + Math.random() * 3.5;
          particlesRef.current.push({
            x: lastPt.x - Math.cos(angle) * 12,
            y: lastPt.y - Math.sin(angle) * 12,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            size: 1.5 + Math.random() * 3,
            alpha: 0.9,
            color: Math.random() > 0.4 ? '#38bdf8' : '#60a5fa',
          });
        }
        drawAirplane(ctx, lastPt.x, lastPt.y, angle);
      } else if (gameState === 'CRASHED') {
        // Airplane flies away off screen
        const crash = crashAnimRef.current;
        if (crash.active) {
          crash.planeX += crash.vx;
          crash.planeY += crash.vy;
          crash.alpha = Math.max(0, crash.alpha - 0.015);
          drawAirplane(ctx, crash.planeX, crash.planeY, angle - 0.2, crash.alpha);
        }
      }
    };

    const drawAirplane = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, alpha = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;

      // Jet Thruster flame glow
      const flameGrad = ctx.createRadialGradient(-18, 0, 1, -26, 0, 18);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#38bdf8');
      flameGrad.addColorStop(0.7, '#2563eb');
      flameGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(-20, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sleek Supersonic Jet Vector (Paper Airplane / Modern Aero Glider)
      // Main Body
      ctx.beginPath();
      ctx.moveTo(26, 0); // Nose tip
      ctx.lineTo(-18, -12); // Left wingtip
      ctx.lineTo(-10, 0); // Tail center notch
      ctx.lineTo(-18, 12); // Right wingtip
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(-18, -12, 26, 12);
      bodyGrad.addColorStop(0, '#60a5fa');
      bodyGrad.addColorStop(0.5, '#e0f2fe');
      bodyGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = bodyGrad;
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 12;
      ctx.fill();

      // Center fold crease / fuselage line
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(-10, 0);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wing shadow for 3D depth
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 64, 175, 0.35)';
      ctx.fill();

      ctx.restore();
    };

    const drawIdlePlaneOnRunway = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const startX = 45;
      const startY = h - 50;

      // Draw glowing launchpad runway indicator
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 120, startY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle engine idling hover vibration
      const idleY = startY - 16 + Math.sin(Date.now() / 260) * 1.5;
      const idleX = startX + 28;
      const idleAngle = -0.16;

      planePosRef.current = { x: idleX, y: idleY, angle: idleAngle };

      // Soft idle thruster sparks occasionally
      if (Math.random() > 0.65) {
        particlesRef.current.push({
          x: idleX - 18,
          y: idleY,
          vx: -(1 + Math.random() * 1.5),
          vy: (Math.random() - 0.5) * 1,
          size: 1.5 + Math.random() * 2,
          alpha: 0.7,
          color: '#38bdf8',
        });
      }

      drawAirplane(ctx, idleX, idleY, idleAngle);
      ctx.restore();
    };

    const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, currentMultiplier, crashMultiplier, waitingCountdown, maxWaitingCountdown, flightDuration]);

  return (
    <div
      ref={containerRef}
      id="m2mfly-canvas-container"
      className="relative w-full h-[360px] sm:h-[420px] md:h-[460px] rounded-2xl overflow-hidden border border-blue-900/40 shadow-[0_0_50px_rgba(15,23,42,0.8)] bg-slate-950 flex items-center justify-center select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Center Countdown Overlay when WAITING or STARTING (Unified Main Screen) */}
      {(gameState === 'WAITING' || gameState === 'STARTING') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 animate-in fade-in duration-200">
          <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl px-6 py-5 sm:px-9 sm:py-6 shadow-[0_0_40px_rgba(14,165,233,0.3)] text-center max-w-sm mx-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              Próxima Rodada
            </div>

            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]">
              {waitingCountdown > 0.1 ? (
                <>
                  <span className="text-cyan-300">{waitingCountdown.toFixed(1)}</span>
                  <span className="text-xl sm:text-2xl text-cyan-400/70 ml-1">s</span>
                </>
              ) : (
                <span className="text-emerald-400 animate-pulse text-3xl sm:text-4xl">DECOLANDO!</span>
              )}
            </div>

            {/* Countdown Progress Bar directly on main screen */}
            <div className="w-full bg-slate-900/90 rounded-full h-2.5 overflow-hidden border border-blue-800/60 mt-3.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-600 rounded-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                style={{
                  width: `${Math.max(0, Math.min(100, (waitingCountdown / maxWaitingCountdown) * 100))}%`,
                }}
              />
            </div>

            <p className="text-xs text-slate-300 font-medium mt-3">
              Faça sua aposta antes da decolagem
            </p>
          </div>
        </div>
      )}

      {/* Center Overlay when Flying */}
      {gameState === 'FLYING' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 animate-fade-in">
          <div className="text-center px-4 py-2">
            <span
              id="m2mfly-live-multiplier"
              className="font-black tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-sky-300 drop-shadow-[0_0_35px_rgba(14,165,233,0.7)] font-mono"
            >
              {currentMultiplier.toFixed(2)}x
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-300 uppercase">
                Voando mais alto...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Center Overlay when Crashed */}
      {gameState === 'CRASHED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 animate-in zoom-in-95 duration-200">
          <div className="bg-slate-950/85 backdrop-blur-md border border-red-500/40 rounded-2xl px-6 py-5 sm:px-10 sm:py-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] text-center max-w-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              O avião voou para longe!
            </div>
            <div
              id="m2mfly-crash-multiplier"
              className="text-4xl sm:text-5xl md:text-6xl font-black text-red-500 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]"
            >
              CRASH {crashMultiplier.toFixed(2)}x
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Próxima rodada começará em instantes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
