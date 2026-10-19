import { play } from "./audio.js";
import { announce } from "./caption.js";
import { beatLength, isRunning, restart, untilNext } from "./clock.js";
import { animate, reducedMotion, wait } from "./motion.js";

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
const root = document.documentElement;

function takeover() {
  root.classList.add("takeover");
  play("rewind");
  restart();
  if (!reducedMotion()) {
    root.classList.add("vhs");
    setTimeout(() => root.classList.remove("vhs"), 700);
  }
  announce("The Archmother has entered the chat. Press Esc to restore the King.", 6000);
}

function endTakeover() {
  if (!root.classList.contains("takeover")) return;
  root.classList.remove("takeover");
  announce("The King is back. Nobody saw anything.", 3000);
}

async function yeahYeah() {
  const stage = document.getElementById("yeah-stage");
  if (stage.classList.contains("is-on")) return;
  if (isRunning()) {
    const lead = untilNext(1) * 1000 - 260;
    await wait(lead < 0 ? lead + beatLength() * 1000 : lead);
  }
  stage.classList.add("is-on");
  const [left, right] = stage.children;
  if (reducedMotion()) {
    await wait(1200);
  } else {
    const meet = `${left.offsetWidth / 2 - 12}px`;
    const fly = (el, from, to) => animate(el, [{ translate: `${from} 0` }, { translate: `${to} 0` }], { duration: 260, easing: "cubic-bezier(.6,0,1,.6)", fill: "forwards" }).finished;
    await Promise.all([fly(left, "-120vw", `-${meet}`), fly(right, "120vw", meet)]);
    animate(stage, [{ scale: 1.08 }, { scale: 1 }], { duration: 200 });
    await Promise.all([
      animate(left, [{ translate: `-${meet} 0` }, { translate: "-60vw 0", opacity: 0 }], { duration: 700, delay: 300, fill: "forwards" }).finished,
      animate(right, [{ translate: `${meet} 0` }, { translate: "60vw 0", opacity: 0 }], { duration: 700, delay: 300, fill: "forwards" }).finished,
    ]);
    left.getAnimations().forEach((a) => a.cancel());
    right.getAnimations().forEach((a) => a.cancel());
  }
  stage.classList.remove("is-on");
}

export function initEggs() {
  let keys = [];
  let typed = "";
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    const key = e.key.toLowerCase();
    if (key === "escape") endTakeover();
    keys = [...keys, key].slice(-KONAMI.length);
    if (keys.join() === KONAMI.join()) {
      keys = [];
      takeover();
    }
    if (key.length === 1) {
      typed = (typed + key).slice(-8);
      if (typed === "yeahyeah") {
        typed = "";
        yeahYeah();
      }
    }
  });
}
