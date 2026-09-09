/**
 * interview-visualizer.js — AI interviewer voice presence
 * Zero dependencies. Vanilla ES module. Works with React, Vue, Svelte, plain HTML.
 *
 *   import { InterviewVisualizer } from './interview-visualizer.js';
 *
 *   const viz = new InterviewVisualizer(canvasEl, { variant: 'aperture' });
 *   viz.setState('ai');           // 'connecting' | 'ai' | 'candidate' | 'idle'
 *   await viz.enableMic();        // candidate state then follows real audio
 *   viz.destroy();                // on unmount
 *
 * variant: 'aperture' (concentric rings) | 'braid' (silk threads) | 'field' (constellation)
 *
 * Options (all optional):
 *   variant      'aperture'
 *   state        'ai'
 *   sensitivity  1.15   input gain
 *   motionSpeed  1      global time scale
 *   glow         true   canvas shadow bloom (set false on low-end devices)
 *   connectors   true   'field' only — draw links between points
 *   hues         { connecting: 82, ai: 258, candidate: 172, idle: 250 }
 *   chromas      { connecting: 0.09, ai: 0.12, candidate: 0.115, idle: 0.045 }
 *
 * Colors are oklch() (Chrome 111+/Safari 15.4+/FF 113+). For older browsers,
 * override col() or swap in hsl().
 *
 * If you already have an AnalyserNode (e.g. from the bot's TTS output stream),
 * skip enableMic() and call viz.attachAnalyser(node) instead.
 *
 * VERBATIM copy from the reference `AI Interview Platform Waveform` artifact
 * (`interview-visualizer.js`) — do not hand-edit. If the design needs to
 * change, change it at the source and re-copy, so this file never silently
 * drifts from the artifact it was reviewed against.
 */

const DEFAULT_HUES = { connecting: 82, ai: 258, candidate: 172, idle: 250 };
const DEFAULT_CHROMAS = { connecting: 0.09, ai: 0.12, candidate: 0.115, idle: 0.045 };
const BANDS = 24;

export class InterviewVisualizer {
  constructor(canvas, opts = {}) {
    if (!canvas) throw new Error('InterviewVisualizer: canvas element required');
    this.cv = canvas;
    this.o = {
      variant: 'aperture', state: 'ai', sensitivity: 1.15, motionSpeed: 1,
      glow: true, connectors: true,
      hues: { ...DEFAULT_HUES, ...(opts.hues || {}) },
      chromas: { ...DEFAULT_CHROMAS, ...(opts.chromas || {}) },
      ...opts
    };

    this.state = this.o.state;
    this.t = 0;
    this.lvl = 0;
    this.conv = this.state === 'connecting' ? 0 : 1;
    this.bands = new Array(BANDS).fill(0);
    this.mix = { connecting: 0, ai: 0, candidate: 0, idle: 0 };
    this.mix[this.state] = 1;

    this.particles = Array.from({ length: 96 }, (_, i) => {
      const ring = i % 3;
      return {
        a: Math.random() * Math.PI * 2,
        r: 0.34 + ring * 0.22 + Math.random() * 0.1,
        s: (Math.random() * 0.5 + 0.5) * (i % 2 ? 1 : -1) * 0.12,
        w: 0.6 + Math.random() * 1.5,
        b: i % BANDS,
        sa: Math.random() * Math.PI * 2,
        sr: 0.15 + Math.random() * 1.15
      };
    });

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(canvas);
    }
    this.resize();

    this._last = performance.now();
    this._loop = (now) => {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this._frame(dt);
      this._raf = requestAnimationFrame(this._loop);
    };
    this._raf = requestAnimationFrame(this._loop);
  }

  /* ---------- public API ---------- */

  setState(next) {
    if (this.mix[next] === undefined) throw new Error('unknown state: ' + next);
    this.state = next;
  }

  setVariant(v) { this.o.variant = v; }

  set(opts) { Object.assign(this.o, opts); }

  /** Ask for the mic. Resolves true on success, false if denied. */
  async enableMic() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      this.actx = this.actx || new (window.AudioContext || window.webkitAudioContext)();
      await this.actx.resume();
      const src = this.actx.createMediaStreamSource(this.stream);
      const an = this.actx.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.72;
      src.connect(an);
      this.attachAnalyser(an);
      return true;
    } catch (e) {
      this.analyser = null;
      return false;
    }
  }

  disableMic() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.analyser = null;
  }

  /** Drive the 'candidate' state from an AnalyserNode you already own. */
  attachAnalyser(node) {
    this.analyser = node;
    this.freq = new Uint8Array(node.frequencyBinCount);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.cv.width = Math.round(r.width * dpr);
    this.cv.height = Math.round(r.height * dpr);
    this.dpr = dpr; this.w = r.width; this.h = r.height;
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    this.disableMic();
    if (this.actx) { this.actx.close(); this.actx = null; }
  }

  /* ---------- signal ---------- */

  /** Speech-like envelope: phrase gating + syllable carrier. Used for the bot
   *  turn, and as a fallback whenever no analyser is attached. */
  _sim(t, seed) {
    const g = (Math.sin(t * 0.42 + seed) + Math.sin(t * 0.27 + seed * 2.3)) * 0.5;
    const gate = Math.max(0, Math.min(1, (g + 0.35) * 3.2));
    const car = Math.abs(Math.sin(t * 8.3 + seed) * Math.sin(t * 3.1 + seed * 1.7) * Math.sin(t * 19.7));
    const syl = 0.45 + 0.55 * Math.abs(Math.sin(t * 5.4 + seed * 0.8));
    return gate * (0.22 + 0.78 * car * syl);
  }

  _frame(dt) {
    const sens = this.o.sensitivity;
    this.t += dt * this.o.motionSpeed;
    const t = this.t, mode = this.state;
    let target = 0;
    let live = false;

    if (mode === 'ai') {
      target = this._sim(t, 0.7) * 0.92;
    } else if (mode === 'candidate') {
      if (this.analyser) {
        live = true;
        this.analyser.getByteFrequencyData(this.freq);
        const n = this.freq.length;
        let s = 0;
        for (let i = 2; i < 140; i++) s += this.freq[i] * this.freq[i];
        target = Math.min(1, Math.sqrt(s / 138) / 118 * sens * 1.6);
        for (let i = 0; i < BANDS; i++) {
          const lo = Math.floor(Math.pow(i / BANDS, 1.7) * n * 0.5) + 2;
          const hi = Math.max(lo + 3, Math.floor(Math.pow((i + 1) / BANDS, 1.7) * n * 0.5) + 2);
          let acc = 0;
          for (let k = lo; k < hi; k++) acc += this.freq[k];
          const v = Math.min(1, acc / (hi - lo) / 150 * sens);
          this.bands[i] += (v - this.bands[i]) * 0.24;
        }
      } else {
        target = this._sim(t, 2.9);
      }
    } else if (mode === 'idle') {
      target = 0.035 + 0.02 * Math.sin(t * 0.9);
    }

    if (!live) {
      target *= sens;
      for (let i = 0; i < BANDS; i++) {
        const v = target * (1 - i / 34) * (0.45 + 0.55 * Math.abs(Math.sin(t * (1.6 + i * 0.31) + i)));
        this.bands[i] += (v - this.bands[i]) * 0.2;
      }
    }

    // asymmetric smoothing: fast attack, slow release — reads as speech, not noise
    this.lvl += (target - this.lvl) * (target > this.lvl ? 0.35 : 0.12);

    for (const k in this.mix) {
      this.mix[k] += ((k === mode ? 1 : 0) - this.mix[k]) * Math.min(1, dt * 4.5);
    }
    this.conv += ((mode === 'connecting' ? 0 : 1) - this.conv) * Math.min(1, dt * 2.2);

    if (!this.w) return;
    if (this.o.variant === 'braid') this._drawBraid();
    else if (this.o.variant === 'field') this._drawField();
    else this._drawAperture();
  }

  /* ---------- color ---------- */

  _hue() {
    let h = 0, c = 0, tot = 0;
    for (const k in this.mix) {
      const m = this.mix[k];
      h += this.o.hues[k] * m; c += this.o.chromas[k] * m; tot += m;
    }
    return tot > 0.001 ? [h / tot, c / tot] : [250, 0.05];
  }

  col(l, c, h, a) { return `oklch(${l} ${c} ${h} / ${a})`; }

  _ctx() {
    const ctx = this.cv.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    return ctx;
  }

  /* ---------- 1a · APERTURE ---------- */

  _drawAperture() {
    const ctx = this._ctx(), w = this.w, h = this.h, t = this.t;
    const cx = w / 2, cy = h / 2, lvl = this.lvl, [hu, ch] = this._hue();
    const base = Math.min(w, h) * 0.13;
    const glow = this.o.glow;

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * (2.2 + lvl * 1.6));
    g.addColorStop(0, this.col(0.78, ch, hu, 0.22 + lvl * 0.3));
    g.addColorStop(1, this.col(0.78, ch, hu, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.lineJoin = 'round';
    for (let i = 0; i < 6; i++) {
      const rBase = base * (0.62 + i * 0.36)
        + lvl * base * (1.35 - i * 0.14)
        + Math.sin(t * 0.6 + i * 0.7) * base * 0.045;
      ctx.beginPath();
      const N = 150;
      for (let k = 0; k <= N; k++) {
        const a = (k / N) * Math.PI * 2;
        const bnd = this.bands[(i * 4 + k % 4) % BANDS];
        const d = 1
          + 0.055 * Math.sin(a * 3 + t * (0.7 + i * 0.13) + i)
          + 0.04 * Math.sin(a * 5 - t * 1.1 + i * 2.1)
          + (0.16 + i * 0.03) * bnd * Math.sin(a * (4 + i) + t * 1.7);
        const r = rBase * d * (0.25 + 0.75 * this.conv);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.97;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(0.5, 1.5 - i * 0.19);
      ctx.strokeStyle = this.col(0.86 - i * 0.02, ch, hu + i * 3,
        (0.62 - i * 0.085) * (0.35 + 0.65 * this.conv) + lvl * 0.14);
      if (glow) { ctx.shadowBlur = 16 + lvl * 26; ctx.shadowColor = this.col(0.8, ch, hu, 0.5); }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const cr = base * (0.34 + lvl * 0.42);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    cg.addColorStop(0, this.col(0.97, ch * 0.5, hu, 0.9));
    cg.addColorStop(1, this.col(0.8, ch, hu, 0));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();

    // connecting: comet sweep, fades out as the session locks in
    const sweep = 1 - this.conv;
    if (sweep > 0.01) {
      const a0 = t * 2.4;
      for (let s = 0; s < 26; s++) {
        const a = a0 - s * 0.055;
        ctx.beginPath();
        ctx.arc(cx, cy, base * 2.1, a, a + 0.06);
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.col(0.9, 0.1, 88, (1 - s / 26) * 0.85 * sweep);
        ctx.stroke();
      }
    }
  }

  /* ---------- 1b · BRAID ---------- */

  _drawBraid() {
    const ctx = this._ctx(), w = this.w, h = this.h, t = this.t;
    const cy = h / 2, lvl = this.lvl, [hu, ch] = this._hue();
    const glow = this.o.glow;
    const pad = w * 0.08;

    const bg = ctx.createLinearGradient(0, cy - h * 0.3, 0, cy + h * 0.3);
    bg.addColorStop(0, this.col(0.7, ch, hu, 0));
    bg.addColorStop(0.5, this.col(0.7, ch, hu, 0.1 + lvl * 0.16));
    bg.addColorStop(1, this.col(0.7, ch, hu, 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pulse = 1 - this.conv;
    const px = pad + ((t * 0.33) % 1) * (w - pad * 2);

    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      const N = 220, amp = h * (0.145 - k * 0.021);
      for (let i = 0; i <= N; i++) {
        const u = i / N, x = pad + u * (w - pad * 2);
        const env = Math.pow(Math.sin(Math.PI * u), 1.35); // pinch at both ends
        const bnd = this.bands[Math.floor(u * 20) + 2] || 0;
        let y = cy;
        y += env * amp * (0.1 + lvl * 1.6 + bnd * 0.7)
          * Math.sin(u * (5.5 + k * 1.6) - t * (1.5 + k * 0.32) + k * 1.1);
        y += env * amp * 0.34 * Math.sin(u * (11 + k * 2.4) + t * (0.8 + k * 0.2));
        y += env * h * 0.022 * Math.sin(u * 3 + t * 0.5 + k);
        if (pulse > 0.01) {
          const d = (x - px) / (w * 0.09);
          y += Math.exp(-d * d) * h * 0.11 * pulse * Math.sin(t * 9 + k) * (1 - k * 0.15);
        }
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineWidth = Math.max(0.55, 1.7 - k * 0.26);
      ctx.strokeStyle = this.col(0.9 - k * 0.03, ch, hu + k * 5, 0.72 - k * 0.11);
      if (glow) { ctx.shadowBlur = 14 + lvl * 24; ctx.shadowColor = this.col(0.82, ch, hu, 0.55); }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = this.col(0.72, 0.01, 80, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad * 0.55, cy); ctx.lineTo(pad * 0.55 + 10, cy);
    ctx.moveTo(w - pad * 0.55, cy); ctx.lineTo(w - pad * 0.55 - 10, cy);
    ctx.stroke();
  }

  /* ---------- 1c · FIELD ---------- */

  _drawField() {
    const ctx = this._ctx(), w = this.w, h = this.h, t = this.t;
    const cx = w / 2, cy = h / 2, lvl = this.lvl, [hu, ch] = this._hue();
    const R = Math.min(w, h) * 0.42;
    const glow = this.o.glow, links = this.o.connectors;

    const bgr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    bgr.addColorStop(0, this.col(0.75, ch, hu, 0.13 + lvl * 0.2));
    bgr.addColorStop(1, this.col(0.75, ch, hu, 0));
    ctx.fillStyle = bgr;
    ctx.fillRect(0, 0, w, h);

    const pts = [];
    for (const p of this.particles) {
      const bnd = this.bands[p.b] || 0;
      const a = p.a + t * p.s + Math.sin(t * 0.4 + p.b) * 0.06;
      const rr = R * (p.r * (1 + lvl * 0.34) + bnd * 0.17 + Math.sin(t * 1.3 + p.b * 0.7) * 0.014);
      // scattered origin -> formation, driven by conv (0 while connecting)
      const sx = cx + Math.cos(p.sa) * R * 1.7 * p.sr;
      const sy = cy + Math.sin(p.sa) * R * 1.7 * p.sr;
      const tx = cx + Math.cos(a) * rr, ty = cy + Math.sin(a) * rr * 0.94;
      const c = this.conv;
      pts.push({ x: sx + (tx - sx) * c, y: sy + (ty - sy) * c, w: p.w, l: bnd, r: p.r });
    }

    if (links && lvl > 0.06) {
      const thr = R * (0.13 + lvl * 0.12);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < thr * thr) {
            const a = (1 - Math.sqrt(d2) / thr) * (0.06 + lvl * 0.36) * this.conv;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = this.col(0.85, ch, hu, a);
            ctx.stroke();
          }
        }
      }
    }

    if (glow) { ctx.shadowBlur = 10 + lvl * 20; ctx.shadowColor = this.col(0.85, ch, hu, 0.6); }
    for (const p of pts) {
      const rad = p.w * (0.85 + lvl * 1.5 + p.l * 1.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, rad), 0, Math.PI * 2);
      ctx.fillStyle = this.col(0.94 - p.r * 0.08, ch, hu, (0.32 + lvl * 0.5) * this.conv + 0.08);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    const core = Math.min(w, h) * 0.028 * (1 + lvl * 1.1);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 3);
    cg.addColorStop(0, this.col(0.98, ch * 0.4, hu, 0.85 * this.conv));
    cg.addColorStop(1, this.col(0.85, ch, hu, 0));
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, core * 3, 0, Math.PI * 2); ctx.fill();
  }
}

export default InterviewVisualizer;
