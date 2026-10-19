import { shutter } from "./audio.js";
import { announce, narrate } from "./caption.js";
import { isKaraoke, untilNext } from "./clock.js";
import { animate, flashesOn, reducedMotion } from "./motion.js";
import { SUSPECTS } from "./suspects.js";

let strip;
let protocol;
let selected = SUSPECTS[0];
let stepTimer = 0;
let hovered = null;
let memes = [];
let facts = {};

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function buildStrip() {
  const scale = el("li", { className: "scale", ariaHidden: "true" },
    [3, 4, 5, 6, 7].map((n) => {
      const label = el("span", { textContent: `${n}ft` });
      label.style.setProperty("--n", n);
      return label;
    }));
  const cards = SUSPECTS.map((s) => {
    const img = el("img", { src: `assets/heroes/${s.slug}_card.png`, alt: "", loading: "lazy", draggable: false });
    const button = el("button", { type: "button", ariaLabel: `${s.name}. ${s.alibi}` }, [img, el("span", { className: "plate", textContent: s.name })]);
    const li = el("li", { className: s.ft ? "suspect" : "suspect is-varies" }, [button]);
    li.style.setProperty("--h", s.ft ?? 6.9);
    li.suspect = s;
    const files = memes.filter((m) => m.heroes.includes(s.slug)).length + (facts[s.slug]?.length ?? 0);
    if (files) li.append(el("span", { className: "file-count", textContent: `${files} ${files === 1 ? "clue" : "clues"}`, title: "Memes and wiki facts in the case file" }));
    return li;
  });
  strip.append(scale, ...cards, el("li", { className: "frame-edge", ariaHidden: "true" }));
}

function setForward(li) {
  if (li === hovered) return;
  hovered = li;
  clearTimeout(stepTimer);
  const apply = () => {
    strip.querySelector(".is-forward")?.classList.remove("is-forward");
    li?.classList.add("is-forward");
  };
  if (isKaraoke() && li) stepTimer = setTimeout(apply, untilNext(1) * 1000);
  else apply();
  if (!li) return;
  selected = li.suspect;
  narrate(li.suspect.alibi);
}

function book(li) {
  const s = li.suspect;
  shutter();
  if (flashesOn()) {
    animate(document.getElementById("camera-flash"), [{ opacity: 0.95 }, { opacity: 0 }], { duration: 450, easing: "ease-out" });
  }
  li.querySelector(".stamp")?.remove();
  const stamp = el("span", { className: "stamp", textContent: "Booked", ariaHidden: "true" });
  li.append(stamp);
  if (!reducedMotion()) {
    animate(stamp, [{ scale: 3, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 180, easing: "cubic-bezier(.5,0,.8,.5)" });
  }
  protocol.hidden = false;
  protocol.replaceChildren(
    el("p", { textContent: `Booked. Charges: ${s.charge}.` }),
    el("h3", { textContent: s.name }),
    el("dl", {}, [
      el("dt", { textContent: "Height" }), el("dd", { textContent: s.ft ? `${s.ft} ft, according to our scale` : "varies" }),
      el("dt", { textContent: "Distinguishing marks" }), el("dd", { textContent: `Known ${s.role}. Always wears ${s.color}.` }),
      el("dt", { textContent: "Statement" }), el("dd", { textContent: s.alibi }),
    ]),
    el("div", { className: "protocol-actions" }, [
      el("button", { type: "button", className: "btn", textContent: "Open case file", onclick: () => openDossier(s) }),
      el("button", { type: "button", className: "btn btn-ghost", textContent: "Release", onclick: () => { protocol.hidden = true; li.querySelector("button").focus(); } }),
    ]),
  );
  announce(`${s.name}, booked. Charges: ${s.charge}. The paperwork will outlive us all.`);
}

function openDossier(s) {
  const dialog = document.getElementById("dossier");
  const portrait = document.getElementById("dossier-portrait");
  portrait.src = `assets/heroes/${s.slug}_card.png`;
  document.getElementById("dossier-name").textContent = s.name;
  document.getElementById("dossier-alibi").textContent = s.alibi;
  const known = facts[s.slug] ?? [];
  document.getElementById("dossier-facts").replaceChildren(...known.map((fact) => el("li", {}, [
    `${fact.text} `,
    el("a", { href: fact.source, textContent: "wiki", target: "_blank", rel: "noopener" }),
  ])));
  const files = memes.filter((m) => m.heroes.includes(s.slug));
  document.getElementById("dossier-memes").replaceChildren(...(files.length
    ? files.map((m) => el("figure", {}, [
      el("img", { src: m.src, alt: m.tag, loading: "lazy" }),
      el("figcaption", {}, [`${m.tag} `, el("a", { href: m.source, textContent: `${m.credit} ${m.author ?? "deadlockdaily.com"}`, target: "_blank", rel: "noopener" })]),
    ]))
    : [el("p", { className: "hint", textContent: "No further evidence. The file is as thin as the alibi." })]));
  dialog.showModal();
  if (!reducedMotion()) animate(dialog, [{ translate: "0 40px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1)" });
  announce(`${s.name}. The file is thicker than it should be.`);
}

function bindDragScroll(view) {
  let start = null;
  let moved = false;
  view.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    start = { x: e.clientX, left: view.scrollLeft };
    moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 5) {
      moved = true;
      view.classList.add("is-dragging");
    }
    if (moved) view.scrollLeft = start.left - dx;
  });
  window.addEventListener("pointerup", () => {
    start = null;
    view.classList.remove("is-dragging");
  });
  view.addEventListener("click", (e) => {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    }
  }, true);
}

export function initLineup(memeList, factMap) {
  memes = memeList;
  facts = factMap;
  strip = document.getElementById("lineup-strip");
  protocol = document.getElementById("protocol");
  const view = document.getElementById("lineup");
  buildStrip();
  bindDragScroll(view);

  const suspectOf = (target) => target.closest?.(".suspect");
  strip.addEventListener("pointerover", (e) => setForward(suspectOf(e.target)));
  strip.addEventListener("focusin", (e) => setForward(suspectOf(e.target)));
  strip.addEventListener("pointerleave", () => setForward(null));
  strip.addEventListener("click", (e) => {
    const li = suspectOf(e.target);
    if (li) book(li);
  });

  view.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const cards = [...strip.querySelectorAll(".suspect")];
    const current = cards.indexOf(suspectOf(document.activeElement));
    const next = cards[Math.max(0, Math.min(cards.length - 1, current + (e.key === "ArrowRight" ? 1 : -1)))];
    next.querySelector("button").focus({ preventScroll: true });
    next.scrollIntoView({ inline: "center", block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  });

  document.getElementById("book").addEventListener("click", () => {
    const li = [...strip.querySelectorAll(".suspect")].find((node) => node.suspect === selected);
    book(li);
  });
}
