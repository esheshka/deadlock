import { animate, pick, reducedMotion } from "./motion.js";

const OPENING = "It was a quiet night in the Cursed Apple. Too quiet. Somebody press the button.";
const SNARK = [
  "The Archmother would like you to know she's not impressed.",
  "Blue looks good on you. That's a lie.",
  "The site is hers now. Win it back in Lore or fake.",
  "Somewhere, a sapphire flame is laughing at you.",
];

let box;
let textEl;
let narration = OPENING;
let karaoke = false;
let overrideTimer = 0;
let lastLineIndex = -1;
let chorus = [];
let dropped = false;

function renderNarration(line) {
  box.classList.remove("is-karaoke", "is-static");
  box.setAttribute("aria-live", "polite");
  textEl.textContent = line;
}

function renderChorus() {
  lastLineIndex = -1;
  box.classList.add("is-karaoke", "is-static");
  box.setAttribute("aria-live", "off");
  textEl.replaceChildren(...chorus.map((line) => Object.assign(document.createElement("span"), { className: "line", textContent: line.join(" ") })));
}

function renderIdle() {
  if (karaoke) return;
  if (dropped) renderChorus();
  else renderNarration(narration);
}

function renderKaraoke({ line, lineIndex, pos }) {
  box.classList.add("is-karaoke");
  box.classList.remove("is-static");
  box.setAttribute("aria-live", "off");
  if (lineIndex !== lastLineIndex || textEl.children.length !== line.length) {
    lastLineIndex = lineIndex;
    textEl.replaceChildren(...line.map((w) => Object.assign(document.createElement("span"), { textContent: w })));
  }
  [...textEl.children].forEach((span, i) => {
    span.classList.toggle("is-now", i === pos);
    span.classList.toggle("is-past", i < pos);
  });
}

export function narrate(line) {
  narration = document.documentElement.dataset.owner === "archmother"
    ? `${line} ${pick(SNARK)}`
    : line;
  if (!karaoke && !dropped && !overrideTimer) renderNarration(narration);
}

export function announce(line, ms = 3500) {
  clearTimeout(overrideTimer);
  renderNarration(line);
  overrideTimer = setTimeout(() => {
    overrideTimer = 0;
    lastLineIndex = -1;
    renderIdle();
  }, ms);
}

const INTERACTIVE = "main a[href], main button:not([disabled]), footer a[href], footer button";

function duck() {
  const zone = box.getBoundingClientRect();
  if (!zone.height) return;
  const blocked = [...document.querySelectorAll(INTERACTIVE)].some((el) => {
    const r = el.getBoundingClientRect();
    return r.width && r.bottom > zone.top - 8 && r.top < zone.bottom + 8 && r.right > zone.left && r.left < zone.right;
  });
  box.classList.toggle("is-ducked", blocked);
}

export function initCaption(chorusLines) {
  chorus = chorusLines;
  box = document.getElementById("caption");
  textEl = document.getElementById("caption-text");
  renderNarration(OPENING);
  let pending = 0;
  const schedule = () => { pending ||= requestAnimationFrame(() => { pending = 0; duck(); }); };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  setInterval(duck, 500);
  document.addEventListener("transport", (e) => {
    karaoke = e.detail.karaoke;
    dropped = e.detail.dropped;
    if (!overrideTimer) renderIdle();
  });
  document.addEventListener("word", (e) => {
    if (!overrideTimer) renderKaraoke(e.detail);
  });
  document.addEventListener("wordend", () => {
    const now = textEl.querySelector(".is-now");
    now?.classList.replace("is-now", "is-past");
  });
  document.addEventListener("beat", () => {
    const now = textEl.querySelector(".is-now");
    if (!now || reducedMotion()) return;
    animate(now, [{ fontWeight: 900 }, { fontWeight: 600 }], { duration: 240, easing: "ease-out" });
  });
}
