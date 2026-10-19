import { setMuted } from "./audio.js";
import { isDropped, isRecording, isRunning, setRate } from "./clock.js";
import { animate, flashesOn, reducedMotion, setTimeScale } from "./motion.js";

const root = document.documentElement;
let slow = false;
let holdTimer = 0;

function bindToggle(id, cls, key, fallback, onChange) {
  const button = document.getElementById(id);
  const apply = (on) => {
    root.classList.toggle(cls, on);
    button.setAttribute("aria-pressed", String(on));
    localStorage.setItem(key, on ? "1" : "0");
    onChange?.(on);
  };
  const stored = localStorage.getItem(key);
  apply(stored === null ? fallback : stored === "1");
  button.addEventListener("click", () => apply(!root.classList.contains(cls)));
}

function punch() {
  if (reducedMotion()) return;
  for (const el of document.querySelectorAll("[data-punch]")) {
    const box = el.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) continue;
    animate(el, [{ scale: 1.06 }, { scale: 1 }], { duration: 180, easing: "cubic-bezier(.2,.8,.3,1)" });
  }
}

function flashBar() {
  if (!isDropped()) return;
  if (flashesOn()) {
    root.classList.add("flash");
    setTimeout(() => root.classList.remove("flash"), 80);
  } else if (!reducedMotion()) {
    animate(document.getElementById("song"), [{ scale: 1.02 }, { scale: 1 }], { duration: 400, easing: "ease-out" });
  }
}

function enterSlow() {
  if (slow || !isDropped()) return;
  slow = true;
  root.classList.add("slowmo");
  setTimeScale(0.25);
  setRate(0.5);
}

function exitSlow() {
  clearTimeout(holdTimer);
  if (!slow) return;
  slow = false;
  root.classList.remove("slowmo");
  setTimeScale(1);
  setRate(1);
  if (reducedMotion()) return;
  root.classList.add("chroma");
  setTimeout(() => root.classList.remove("chroma"), 360);
}

const isControl = (el) => el.closest("button, a, input, select, textarea, label, dialog, [tabindex]");

function bindSlowMo() {
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat || isRecording() || isControl(e.target)) return;
    if (!isDropped()) return;
    e.preventDefault();
    enterSlow();
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") exitSlow();
  });
  const hero = document.getElementById("song");
  hero.addEventListener("pointerdown", (e) => {
    if (isControl(e.target)) return;
    holdTimer = setTimeout(enterSlow, 180);
  });
  for (const type of ["pointerup", "pointercancel", "blur"]) window.addEventListener(type, exitSlow);
  hero.addEventListener("contextmenu", (e) => { if (slow) e.preventDefault(); });
}

export function initFx() {
  bindToggle("flash-toggle", "no-flashes", "hk.noflash", true);
  bindToggle("mute-toggle", "muted", "hk.mute", false, (muted) => {
    setMuted(muted);
    document.dispatchEvent(new CustomEvent("mutechange", { detail: { muted } }));
  });
  const jukebox = document.getElementById("jukebox");
  const tab = document.getElementById("jukebox-tab");
  if (matchMedia("(max-width: 640px)").matches) {
    jukebox.classList.add("is-tucked");
    tab.setAttribute("aria-expanded", "false");
  }
  const tuck = (on) => {
    jukebox.classList.toggle("is-tucked", on);
    tab.setAttribute("aria-expanded", String(!on));
  };
  let openedAt = 0;
  tab.addEventListener("click", () => {
    const open = jukebox.classList.contains("is-tucked");
    tuck(!open);
    openedAt = scrollY;
  });
  addEventListener("scroll", () => {
    if (!jukebox.classList.contains("is-tucked") && Math.abs(scrollY - openedAt) > 80) tuck(true);
  }, { passive: true });
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#jukebox, #jukebox-tab")) tuck(true);
  });
  let autoTucked = false;
  document.addEventListener("transport", (e) => {
    if (!e.detail.dropped || autoTucked) return;
    autoTucked = true;
    setTimeout(() => tuck(true), 2500);
  });
  document.addEventListener("beat", () => { if (isRunning()) punch(); });
  document.addEventListener("bar", flashBar);
  document.addEventListener("drop", () => {
    if (reducedMotion()) return;
    animate(document.getElementById("hero-line"), [{ scale: 1.18 }, { scale: 1 }], { duration: 420, easing: "cubic-bezier(.2,.9,.3,1)" });
    if (flashesOn()) {
      root.classList.add("flash");
      setTimeout(() => root.classList.remove("flash"), 120);
    }
  });
  bindSlowMo();
}
