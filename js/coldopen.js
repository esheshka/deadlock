import { drop, isAutoMuted, isDropped, justUnlocked } from "./clock.js";
import { animate, reducedMotion } from "./motion.js";

const BIG_WORDS = new Set(["lowkey", "evil", "hidden", "king", "fucking", "thing", "bidding"]);

let hero;
let line;
let button;
let openingWords;
let censorPending = false;
let accentAt = 0;
let accentKind = "";

const bare = (text) => text.toLowerCase().replace(/[^a-z']/g, "");
const rand = (min, max) => min + Math.random() * (max - min);

function wordSpan(text) {
  const span = document.createElement("span");
  span.className = BIG_WORDS.has(bare(text)) ? "w w-big" : "w";
  span.textContent = text;
  return span;
}

const stacked = matchMedia("(max-width: 600px)");

function scatter() {
  line.classList.remove("is-solo");
  line.classList.add("is-scattered");
  line.classList.toggle("is-stacked", stacked.matches);
  line.replaceChildren(...openingWords.map(wordSpan));
  if (stacked.matches) {
    [...line.children].forEach((span) => span.classList.add("is-in"));
    return;
  }
  const area = hero.getBoundingClientRect();
  const rows = innerWidth < 640 ? 3 : 2;
  const cols = Math.ceil(line.children.length / rows);
  [...line.children].forEach((span, i) => {
    span.classList.add("is-in");
    const box = span.getBoundingClientRect();
    const half = Math.min(box.width / 2, area.width / 2);
    const slotX = Math.max(area.left + half, Math.min(area.right - half,
      area.left + area.width * (0.12 + 0.76 * ((i % cols) + rand(0.2, 0.8)) / cols)));
    const slotY = area.top + area.height * (0.14 + 0.42 * (Math.floor(i / cols) + rand(0.2, 0.8)) / rows);
    span.dataset.x = Math.round(slotX - (box.left + box.width / 2));
    span.dataset.y = Math.round(slotY - (box.top + box.height / 2));
    span.style.translate = `${span.dataset.x}px ${span.dataset.y}px`;
    span.style.rotate = `${rand(-12, 12)}deg`;
  });
}

function assemble() {
  line.classList.remove("is-scattered", "is-stacked");
  [...line.children].forEach((span, i) => {
    const from = { translate: span.style.translate, rotate: span.style.rotate };
    span.style.translate = "";
    span.style.rotate = "";
    if (!reducedMotion()) {
      animate(span, [from, { translate: "0 0", rotate: "0deg" }], { duration: 520, delay: i * 50, easing: "cubic-bezier(.7,0,.2,1.3)", fill: "backwards" });
    }
  });
}

function drift(e) {
  if (!line.classList.contains("is-scattered") || stacked.matches || reducedMotion()) return;
  for (const span of line.children) {
    const box = span.getBoundingClientRect();
    const dx = box.left + box.width / 2 - e.clientX;
    const dy = box.top + box.height / 2 - e.clientY;
    const push = Math.max(0, 1 - Math.hypot(dx, dy) / 320) * 60;
    const angle = Math.atan2(dy, dx);
    span.style.translate = `${+span.dataset.x + Math.cos(angle) * push}px ${+span.dataset.y + Math.sin(angle) * push}px`;
  }
}

function enterWord(span, pos) {
  span.classList.add("is-in");
  if (reducedMotion()) return;
  const technique = pos % 3;
  if (technique === 0) {
    animate(span, [{ scale: 2.4, fontWeight: 900, opacity: 0 }, { scale: 1, fontWeight: 200, opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1)" });
  } else if (technique === 1) {
    animate(span, [{ translate: `${pos % 2 ? "-" : ""}40vw 0`, opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 220, easing: "cubic-bezier(.6,0,.2,1)" });
  } else {
    const letters = [...span.textContent].map((ch) => Object.assign(document.createElement("span"), { textContent: ch, className: "ch" }));
    span.replaceChildren(...letters);
    letters.forEach((ch) => animate(ch, [
      { translate: `${rand(-120, 120)}px ${rand(-160, 160)}px`, rotate: `${rand(-90, 90)}deg`, opacity: 0 },
      { translate: "0 0", rotate: "0deg", opacity: 1 },
    ], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }));
  }
}

function fitSolo(span) {
  const room = hero.getBoundingClientRect();
  span.style.fontSize = "100px";
  span.style.fontWeight = 900;
  const wide = span.getBoundingClientRect().width || 1;
  const size = Math.min(100 * room.width * 0.92 / wide, room.height * 0.55, stacked.matches ? innerWidth * 0.5 : 420);
  span.style.fontSize = `${Math.round(size)}px`;
  span.style.fontWeight = "";
}

function showWord({ word }) {
  if (line.classList.contains("is-scattered")) return;
  line.classList.add("is-solo");
  const span = wordSpan(word);
  span.classList.add("is-in", "is-now");
  line.replaceChildren(span);
  fitSolo(span);
  if (!reducedMotion()) {
    const kind = performance.now() - accentAt < 150 ? accentKind : "";
    const peak = kind === "drop" ? 1.22 : kind === "bar" ? 1.12 : 1.04;
    animate(span, [
      { fontWeight: 200, scale: 0.9 },
      { fontWeight: 900, scale: peak, offset: 0.35 },
      { fontWeight: 700, scale: 1 },
    ], { duration: kind ? 420 : 300, easing: "cubic-bezier(.2,.9,.3,1)" });
  }
  if (bare(word) === "fucking") censor();
}

function endWord() {
  line.querySelector(".is-now")?.classList.replace("is-now", "is-past");
}

function censor() {
  if (reducedMotion()) return;
  const plaque = hero.querySelector(".censor");
  censorPending = true;
  hero.classList.add("is-shaking");
  setTimeout(() => hero.classList.remove("is-shaking"), 320);
  plaque.classList.add("is-on");
  animate(plaque, [{ translate: "-50% -140%" }, { translate: "-50% 0" }], { duration: 200, easing: "cubic-bezier(.3,1.4,.5,1)" });
}

function knockCensor() {
  censorPending = false;
  const plaque = hero.querySelector(".censor");
  const hand = hero.querySelector(".amber-hand");
  hand.classList.add("is-on");
  animate(hand, [{ translate: "-60vw 0" }, { translate: "0 0", offset: 0.4 }, { translate: "-60vw 0" }], { duration: 520, easing: "ease-in-out" })
    .finished.then(() => hand.classList.remove("is-on"));
  setTimeout(() => {
    animate(plaque, [{ translate: "-50% 0", rotate: "0deg" }, { translate: "-30% 110vh", rotate: "28deg" }], { duration: 700, easing: "cubic-bezier(.5,0,.9,.6)" })
      .finished.then(() => plaque.classList.remove("is-on"));
  }, 200);
}

function inflate() {
  const now = line.querySelector(".is-now");
  if (!now || reducedMotion()) return;
  animate(now, [{ fontWeight: 700 }, { fontWeight: 900, offset: 0.3 }, { fontWeight: 700 }], { duration: 400, easing: "ease-out" });
}

export function initColdOpen(opening) {
  hero = document.getElementById("song");
  line = document.getElementById("hero-line");
  button = document.getElementById("drop");
  openingWords = opening;
  scatter();
  document.fonts.ready.then(() => { if (line.classList.contains("is-scattered")) scatter(); });
  stacked.addEventListener("change", () => { if (line.classList.contains("is-scattered")) scatter(); });

  let holdUntil = 0;
  const hint = document.getElementById("sound-hint");
  button.addEventListener("click", () => {
    if (justUnlocked() && isDropped()) return;
    drop(!isDropped());
  });
  hero.addEventListener("pointermove", drift);
  document.addEventListener("transport", (e) => {
    button.textContent = !e.detail.dropped ? "Drop the beat" : isAutoMuted() ? "Sound on" : "Stop the beat";
    hint.hidden = !(e.detail.dropped && isAutoMuted());
    if (e.detail.audible && line.classList.contains("is-scattered")) {
      assemble();
      holdUntil = performance.now() + 1100;
    } else if (!e.detail.dropped && !line.classList.contains("is-scattered")) {
      scatter();
    }
  });
  document.addEventListener("trackmap", (e) => {
    const hook = e.detail.lines.find((words) => words.some((w) => /hidden/i.test(w)));
    if (!hook) return;
    openingWords = hook;
    line.setAttribute("aria-label", hook.join(" "));
    if (line.classList.contains("is-scattered")) scatter();
  });
  document.addEventListener("word", (e) => {
    if (performance.now() > holdUntil) showWord(e.detail);
  });
  document.addEventListener("wordend", endWord);
  const accent = (kind) => () => { accentAt = performance.now(); accentKind = kind; };
  document.addEventListener("bar", accent("bar"));
  document.addEventListener("drop", accent("drop"));
  document.addEventListener("beat", () => {
    if (censorPending) knockCensor();
    else inflate();
  });
}
