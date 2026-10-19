let ctx;
let master;
let noiseBuffer;

export function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : 0.8;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noiseBuffer.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isMuted() {
  return document.documentElement.classList.contains("muted");
}

export function setMuted(muted) {
  document.documentElement.classList.toggle("muted", muted);
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
}

function env(t, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(master);
  return g;
}

function osc(type, freq, t, dur, out) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noise(t, dur, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.connect(out);
  src.start(t, Math.random() * 0.5, dur + 0.05);
  return src;
}

function filter(type, freq, q, out) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(out);
  return f;
}

function vibrato(o, t, dur, rate, depth) {
  const lfo = ctx.createOscillator();
  const amount = ctx.createGain();
  lfo.frequency.value = rate;
  amount.gain.value = depth;
  lfo.connect(amount).connect(o.frequency);
  lfo.start(t);
  lfo.stop(t + dur + 0.05);
}

export function kick(t) {
  const o = osc("sine", 150, t, 0.3, env(t, 1, 0.002, 0.28));
  o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
}

export function hat(t) {
  noise(t, 0.05, filter("highpass", 7000, 0.7, env(t, 0.25, 0.001, 0.04)));
}

export function clap(t) {
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.012;
    noise(s, 0.08, filter("bandpass", 1500, 1.2, env(s, 0.5, 0.001, i === 2 ? 0.14 : 0.02)));
  }
}

export function shutter(t = audio().currentTime) {
  noise(t, 0.03, filter("bandpass", 3000, 2, env(t, 0.7, 0.001, 0.025)));
  noise(t + 0.07, 0.05, filter("bandpass", 1800, 2, env(t + 0.07, 0.5, 0.001, 0.05)));
}

const SOUNDS = {
  orb(t) {
    const g = env(t, 0.5, 0.003, 0.6);
    osc("sine", 880, t, 0.6, g);
    osc("sine", 1320, t, 0.6, g);
  },
  rewind(t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    g.connect(master);
    const o = osc("sawtooth", 120, t, 0.62, filter("lowpass", 2500, 1, g));
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.6);
  },
  trombone(t) {
    [311, 293.7, 277.2, 261.6].forEach((f, i) => {
      const s = t + i * 0.42;
      const dur = i === 3 ? 1.1 : 0.38;
      const o = osc("sawtooth", f, s, dur, filter("lowpass", 900, 1, env(s, 0.35, 0.03, dur)));
      if (i === 3) vibrato(o, s, dur, 5, 7);
    });
  },
};

export function play(name, t = audio().currentTime) {
  audio();
  SOUNDS[name](t);
}
