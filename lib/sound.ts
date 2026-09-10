/**
 * Web Audio API synthesizer for M2MFly.
 * Generates dynamic pitch-shifting engine hum, cashout chime, and crash audio without external files.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('m2mfly_muted');
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('m2mfly_muted', String(this.isMuted));
    }
    if (this.isMuted) {
      this.stopEngine();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts aerodynamic jet engine sound (warm, pleasant sine drone, zero noise artifacts).
   */
  public startEngine(initialMultiplier = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopEngine();

    try {
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const masterGain = this.ctx.createGain();

      // Sine waves produce smooth musical tone without harsh buzzy harmonics
      osc.type = 'sine';
      subOsc.type = 'sine';

      // Soft low-pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, this.ctx.currentTime);

      const baseFreq = 100 + (initialMultiplier - 1) * 20;
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      subOsc.frequency.setValueAtTime(baseFreq * 0.5, this.ctx.currentTime);

      // Subtle, non-intrusive ambient gain
      masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.022, this.ctx.currentTime + 0.3);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(this.ctx.destination);

      osc.start();
      subOsc.start();
      this.engineOsc = osc;
      this.engineSubOsc = subOsc;
      this.engineGain = masterGain;
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Dynamically increases engine frequency as multiplier increases smoothly.
   */
  public updateEnginePitch(multiplier: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc) return;
    try {
      const targetFreq = Math.min(320, 100 + Math.log(multiplier) * 65 + (multiplier - 1) * 8);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
      if (this.engineSubOsc) {
        this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, this.ctx.currentTime, 0.08);
      }
    } catch {
      // Ignore
    }
  }

  public stopEngine() {
    const osc = this.engineOsc;
    const sub = this.engineSubOsc;
    const gain = this.engineGain;

    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;

    if (gain && this.ctx) {
      try {
        gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
      } catch {
        // Ignore
      }
    }

    setTimeout(() => {
      try {
        osc?.stop();
        osc?.disconnect();
      } catch {
        // Ignore
      }
      try {
        sub?.stop();
        sub?.disconnect();
      } catch {
        // Ignore
      }
    }, 60);
  }

  /**
   * Plays crash sound: short, compact explosion (ruído curto filtrado + impacto sutil).
   */
  public playCrash() {
    this.stopEngine();
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.26; // Som curto e controlado

      // 1. Ruído filtrado para o efeito de explosão ("puff / blast")
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Filtro passa-baixa que cai rapidamente, abafando o ruído
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(580, now);
      filter.frequency.exponentialRampToValueAtTime(70, now + duration);

      // Envelope do ruído (rápido ataque e decaimento exponencial breve)
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.16, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      // 2. Impacto grave curto (punch/thump sutil para dar corpo à mini-explosão)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(115, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      subGain.gain.setValueAtTime(0.14, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

      subOsc.start(now);
      subOsc.stop(now + 0.22);
    } catch {
      // Ignore
    }
  }

  /**
   * Plays victory chime when cashing out.
   */
  public playCashout() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      // High bright arpeggio (C6, E6, G6, C7)
      const notes = [1046.5, 1318.51, 1567.98, 2093.0];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, this.ctx.currentTime + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.06);
        osc.stop(this.ctx.currentTime + idx * 0.06 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Soft UI click / bet confirmation.
   */
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundManager();
