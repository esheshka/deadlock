import { audio, kick, hat, clap, isMuted } from "./audio.js";
import { announce } from "./caption.js";

const SYNC_KEY = "hk.sync";
const DRUM_MACHINE_BPM = 100;
const BROKEN_LINE = "The jukebox is broken. Here's a drum machine.";

let song;
let lines;
let words = [];
let timed = [];
let wordStarts = [];
let dropTimes = [];
let track = null;
let bars = new Set();
let gridBpm = DRUM_MACHINE_BPM;

let player;
let ytReady = false;
let ytBroken = false;
let pendingPlay = false;
let dropped = false;
let autoMuted = false;
let ytState = -1;
let probeUntil = 0;
let unlockedAt = -Infinity;

let source = null;
let base = { t: 0, p: 0, rate: 1 };
let rate = 1;
const synthUsers = new Set();
let lastBeat = -1;
let lastWord = -1;
let wordEnd = Infinity;
let lastDrop = -1;
let scheduledUntil = -Infinity;

export function songTime() {
  if (!source) return base.t;
  return base.t + ((performance.now() - base.p) / 1000) * base.rate;
}

// beats come from data/sync.json while the real track plays, otherwise from a steady grid
const onTrack = () => source === "youtube" && track !== null;

export const isRunning = () => source !== null;
export const isDropped = () => dropped;
export const isKaraoke = onTrack;
export const beatLength = () => 60 / (onTrack() ? track.bpm : gridBpm);

const trackTime = (t = songTime()) => t - song.offset;

function lastIndexAtOrBefore(times, t) {
  let lo = 0;
  let hi = times.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

function beatTime(i) {
  if (onTrack()) {
    if (i < 0) return track.beats[0] + i * beatLength();
    return track.beats[i] ?? track.beats.at(-1) + (i - track.beats.length + 1) * beatLength();
  }
  return i * beatLength();
}

function beatIndex(t = trackTime()) {
  if (onTrack()) {
    return t < track.beats[0] ? -1 : lastIndexAtOrBefore(track.beats, t);
  }
  return Math.floor(t / beatLength());
}

// real seconds until the next grid line, div = subdivisions per beat
export function untilNext(div) {
  if (!source || !base.rate) return 0;
  const t = trackTime();
  const i = beatIndex(t);
  const start = beatTime(i);
  const step = (beatTime(i + 1) - start) / div;
  return (start + Math.ceil((t - start) / step) * step - t) / base.rate;
}

function emitTransport() {
  document.documentElement.classList.toggle("karaoke", isKaraoke());
  document.documentElement.classList.toggle("dropped", dropped);
  document.dispatchEvent(new CustomEvent("transport", { detail: { source, dropped, karaoke: isKaraoke(), audible: dropped && !autoMuted } }));
}

export const isAutoMuted = () => autoMuted;
export const justUnlocked = () => performance.now() - unlockedAt < 600;

function unlockSound() {
  if (!autoMuted) return;
  autoMuted = false;
  unlockedAt = performance.now();
  if (!isMuted()) player.unMute();
  emitTransport();
}

function resetCursors() {
  lastBeat = beatIndex() - 1;
  lastWord = -1;
  wordEnd = Infinity;
  lastDrop = lastIndexAtOrBefore(dropTimes, trackTime());
  scheduledUntil = -Infinity;
}

function setSource(next) {
  if (next === source) return;
  base = { t: songTime(), p: performance.now(), rate: next === "synth" ? rate : base.rate };
  source = next;
  resetCursors();
  emitTransport();
}

export function useSynth(key, on) {
  if (on) {
    synthUsers.add(key);
    audio();
  } else {
    synthUsers.delete(key);
  }
  if (synthUsers.size && !source) {
    base = { t: song.offset - 0.1, p: performance.now(), rate };
    setSource("synth");
  } else if (!synthUsers.size && source === "synth") {
    setSource(null);
  } else {
    emitTransport();
  }
}

export function setRate(next) {
  base = { t: songTime(), p: performance.now(), rate: source === "youtube" ? base.rate : next };
  rate = next;
  if (source === "youtube") {
    player.setPlaybackRate(next);
    base.rate = next;
  }
}

export function drop(on) {
  dropped = on;
  if (on) {
    if (ytReady && !ytBroken) {
      player.playVideo();
    } else {
      pendingPlay = !ytBroken;
      useSynth("edit", true);
      if (ytBroken) announce(BROKEN_LINE, 5000);
    }
  } else {
    pendingPlay = false;
    probeUntil = 0;
    if (ytReady) player.pauseVideo();
    useSynth("edit", false);
  }
  emitTransport();
}

export function restart() {
  if (source === "youtube") player.seekTo(0, true);
  else base = { t: song.offset - 0.1, p: performance.now(), rate: base.rate };
  resetCursors();
}

function breakJukebox() {
  if (ytBroken || ytReady) return;
  ytBroken = true;
  document.getElementById("jukebox").classList.add("is-broken");
  if (pendingPlay) announce(BROKEN_LINE, 5000);
  pendingPlay = false;
}

function loadYouTube() {
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("yt", {
      videoId: song.id,
      host: "https://www.youtube-nocookie.com",
      playerVars: { playsinline: 1, rel: 0, autoplay: 1, ...(location.protocol.startsWith("http") && { origin: location.origin }) },
      events: { onReady, onStateChange, onError },
    });
  };
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  script.onerror = breakJukebox;
  document.head.append(script);
  setTimeout(breakJukebox, 10000);
}

function onReady() {
  if (ytBroken) {
    ytBroken = false;
    document.getElementById("jukebox").classList.remove("is-broken");
  }
  ytReady = true;
  pendingPlay = false;
  if (isMuted()) player.mute();
  player.playVideo();
  probeUntil = performance.now() + 1200;
  setTimeout(() => {
    const blocked = ytState !== YT.PlayerState.PLAYING || (player.isMuted?.() && !isMuted());
    if (blocked && !autoMuted) playMuted();
  }, 1000);
}

function playMuted() {
  autoMuted = true;
  player.mute();
  player.playVideo();
  emitTransport();
}

function onError() {
  ytReady = false;
  breakJukebox();
  if (dropped) {
    useSynth("edit", true);
    announce(BROKEN_LINE, 5000);
  }
}

function onStateChange({ data }) {
  const S = YT.PlayerState;
  ytState = data;
  if (data === S.PAUSED && performance.now() < probeUntil && !autoMuted) {
    playMuted();
    return;
  }
  if (data === S.PLAYING) {
    dropped = true;
    synthUsers.delete("edit");
    if (rate !== 1) player.setPlaybackRate(rate);
    source = null;
    base = { t: player.getCurrentTime(), p: performance.now(), rate: player.getPlaybackRate() };
    setSource("youtube");
  } else if (data === S.BUFFERING && source === "youtube") {
    base = { t: player.getCurrentTime(), p: performance.now(), rate: 0 };
  } else if (data === S.ENDED && dropped) {
    if (record) printRecord();
    player.seekTo(0, true);
    player.playVideo();
  } else if (data === S.PAUSED) {
    base = { t: player.getCurrentTime(), p: performance.now(), rate: 0 };
    if (source === "youtube") setSource(synthUsers.size ? "synth" : null);
    dropped = false;
    emitTransport();
  }
}

function syncYouTube() {
  if (source !== "youtube") return;
  const actual = player.getCurrentTime();
  const now = performance.now();
  const predicted = songTime();
  const drift = actual - predicted;
  const playRate = player.getPlaybackRate();
  if (Math.abs(drift) > 1) {
    base = { t: actual, p: now, rate: playRate };
    resetCursors();
  } else {
    base = { t: Math.abs(drift) > 0.05 ? predicted + drift * 0.25 : predicted, p: now, rate: playRate };
  }
}

// the drum machine only plays when the jukebox is out
const drumsAudible = () => source === "synth" && synthUsers.size > 0;

const eighthTime = (e) => {
  const i = Math.floor(e / 2);
  const start = beatTime(i);
  return start + (e - 2 * i) * (beatTime(i + 1) - start) / 2;
};

function scheduleDrums() {
  if (!source || !base.rate || !drumsAudible()) return;
  const ctx = audio();
  const t = trackTime();
  let e = Math.max(scheduledUntil + 1, 2 * beatIndex(t));
  while (eighthTime(e) < t) e++;
  for (; eighthTime(e) < t + 0.1 * base.rate; e++) {
    const when = ctx.currentTime + (eighthTime(e) - t) / base.rate;
    const step = ((e % 8) + 8) % 8;
    hat(when);
    if (step === 0 || step === 3 || step === 4) kick(when);
    if (step === 2 || step === 6) clap(when);
    scheduledUntil = e;
  }
}

function emit(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

function emitWord(index) {
  const entry = timed[index];
  emit("word", { index, word: entry.w, line: lines[entry.line], lineIndex: entry.line, pos: entry.pos });
  wordEnd = entry.end;
}

function tick() {
  requestAnimationFrame(tick);
  if (!source) return;
  const t = trackTime();
  const beat = beatIndex(t);
  if (beat < lastBeat) {
    resetCursors();
  } else if (beat > lastBeat && beat >= 0) {
    lastBeat = beat;
    const bar = onTrack() ? bars.has(beat) : beat % 4 === 0;
    emit("beat", { index: beat, bar });
    if (bar) emit("bar", { index: beat });
  }
  if (onTrack()) {
    const d = lastIndexAtOrBefore(dropTimes, t);
    if (d > lastDrop) {
      lastDrop = d;
      emit("drop", track.drops[d]);
    }
  }
  if (!isKaraoke()) return;
  const w = lastIndexAtOrBefore(wordStarts, t);
  if (w >= 0 && w !== lastWord) {
    lastWord = w;
    emitWord(w);
  } else if (t >= wordEnd) {
    wordEnd = Infinity;
    emit("wordend", { index: w });
  }
}

function showSync() {
  document.getElementById("bpm-out").value = String(Math.round(gridBpm * 10) / 10);
  document.getElementById("offset-out").value = `${Math.round(song.offset * 1000)}ms`;
}

function saveSync() {
  localStorage.setItem(SYNC_KEY, JSON.stringify({ bpm: gridBpm, offset: song.offset }));
  showSync();
  console.log(`bpm: ${gridBpm}, offset: ${song.offset.toFixed(3)},`);
  scheduledUntil = -Infinity;
}

let taps = [];

// debug tool: sets the drum machine tempo; the real track follows data/sync.json
function tap() {
  const now = performance.now();
  if (taps.length && now - taps.at(-1) > 2000) taps = [];
  taps.push(now);
  taps = taps.slice(-16);
  if (taps.length < 4) return;
  const gaps = taps.slice(1).map((p, i) => p - taps[i]).sort((a, b) => a - b);
  gridBpm = Math.round(600000 / gaps[gaps.length >> 1]) / 10;
  saveSync();
}

function nudgeOffset(ms) {
  song.offset = Math.round((song.offset + ms / 1000) * 1000) / 1000;
  saveSync();
}

let record = null;

function printRecord() {
  console.log(JSON.stringify(record));
}

function initRecord() {
  if (!new URLSearchParams(location.search).has("record")) return;
  record = [];
  document.getElementById("record-badge").hidden = false;
  document.documentElement.classList.add("recording");
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.repeat && source === "youtube") {
      e.preventDefault();
      const word = words[record.length % words.length].w;
      record.push([Math.round(songTime() * 100) / 100, word]);
      announce(`${record.length}: ${word}`, 600);
    } else if (e.code === "Enter" && record.length) {
      printRecord();
    }
  });
}

export const isRecording = () => record !== null;

function setLines(textLines) {
  lines = textLines;
  words = lines.flatMap((line, li) => line.map((w, pos) => ({ w, line: li, pos })));
}

async function loadTrackMap() {
  let map;
  try {
    const res = await fetch("data/sync.json");
    if (!res.ok) return;
    map = await res.json();
  } catch {
    return;
  }
  track = { ...map, drops: map.drops ?? [] };
  dropTimes = track.drops.map((d) => d.t);
  const downbeats = track.downbeats ?? [];
  bars = new Set(track.beats.flatMap((b, i) => (downbeats.some((d) => Math.abs(d - b) < 0.06) ? [i] : [])));
  setLines(track.lines.map((line) => line.words.map((w) => w.w)));
  timed = track.lines.flatMap((line, li) => line.words.map((w, pos) => ({ ...w, line: li, pos })));
  wordStarts = timed.map((w) => w.start);
  if (!localStorage.getItem(SYNC_KEY)) gridBpm = track.bpm;
  showSync();
  resetCursors();
  emitTransport();
  emit("trackmap", { lines });
}

export function initClock(config) {
  song = config.song;
  setLines(config.lines);
  const saved = JSON.parse(localStorage.getItem(SYNC_KEY) || "null");
  if (saved) {
    gridBpm = saved.bpm;
    song.offset = saved.offset;
  }
  showSync();

  document.getElementById("tap").addEventListener("click", tap);
  document.getElementById("offset-down").addEventListener("click", () => nudgeOffset(-10));
  document.getElementById("offset-up").addEventListener("click", () => nudgeOffset(10));
  document.addEventListener("mutechange", (e) => {
    if (ytReady) e.detail.muted ? player.mute() : player.unMute();
  });

  for (const type of ["pointerup", "keydown", "touchend"]) document.addEventListener(type, unlockSound, { capture: true });
  initRecord();
  loadTrackMap();
  loadYouTube();
  setInterval(syncYouTube, 250);
  setInterval(scheduleDrums, 25);
  requestAnimationFrame(tick);
}
