const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
let timeScale = 1;

export const reducedMotion = () => reduceQuery.matches;

export const flashesOn = () => !reduceQuery.matches && !document.documentElement.classList.contains("no-flashes");

export function setTimeScale(scale) {
  timeScale = scale;
  document.getAnimations().forEach((a) => { a.playbackRate = scale; });
}

export function animate(el, keyframes, options) {
  const anim = el.animate(keyframes, options);
  anim.playbackRate = timeScale;
  return anim;
}

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
