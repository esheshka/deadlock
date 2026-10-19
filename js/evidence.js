import { announce, narrate } from "./caption.js";
import { isRunning } from "./clock.js";
import { animate, reducedMotion } from "./motion.js";

const LAYOUT_KEY = "hk.wall";
const ACCUSATIONS = [
  "both have hats", "suspicious timing", "never seen in the same lane", "same vibe", "that's just Viscous",
  "same tailor", "shared a cab once", "alibi too clean", "both hum the song", "left at the same time",
  "matching receipts", "same burner phone", "seen near the Cursed Apple", "owes him money", "too quiet on comms",
  "identical shoe prints", "same handwriting", "both say yeah twice",
];
const MOBILE_LABELS = 3;
const SVG_NS = "http://www.w3.org/2000/svg";
const MOBILE = matchMedia("(max-width: 640px)");
const DRAW_DESKTOP = 8;
const DRAW_MOBILE = 5;

let pool;
let view;
let wall;
let threadsSvg;
let labels;
let deck = [];
let cards = [];
let threads = [];
let zoom = 1;
let cols = 0;
let cardW = 0;
let cardH = 0;

const drawSize = () => (MOBILE.matches ? DRAW_MOBILE : DRAW_DESKTOP);

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// draws without repeats until the pool runs out, then reshuffles everything except what is on the wall
function drawIndices(n) {
  const onWall = cards.map((c) => c.index);
  if (deck.length < n) {
    const fresh = shuffled(pool.map((_, i) => i)).filter((i) => !onWall.includes(i) && !deck.includes(i));
    deck = [...deck, ...fresh];
  }
  return deck.splice(0, n);
}

// card positions are centers as fractions of the wall, on a grid that fits one screen
function defaultLayout() {
  const rows = Math.ceil(cards.length / cols);
  const jitter = () => (Math.random() - 0.5) * 0.16;
  return cards.map((_, i) => ({
    x: ((i % cols) + 0.5 + jitter()) / cols,
    y: (Math.floor(i / cols) + 0.5 + jitter() * 0.6) / rows,
  }));
}

function saveLayout() {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify({ cols, items: cards.map((c) => c.index), pos: cards.map((c) => c.pos) }));
}

function savedLayout() {
  const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
  const valid = saved?.items?.length === drawSize() && saved.items.every((i) => i < pool.length);
  return valid ? saved : null;
}

function fit() {
  const n = cards.length;
  const nextCols = MOBILE.matches ? 2 : Math.min(4, n);
  const rows = Math.ceil(n / nextCols);
  const wallH = Math.max(320, innerHeight - (MOBILE.matches ? 150 : 130));
  const width = view.clientWidth;
  const fitW = Math.min(230, width / nextCols - 28, (wallH / rows - 64) / 0.72);
  view.style.setProperty("--wall-h", `${wallH}px`);
  view.style.setProperty("--card-w", `${Math.floor(fitW)}px`);
  cardW = cards[0]?.el.offsetWidth ?? fitW;
  cardH = cards[0]?.el.offsetHeight ?? fitW;
  const changed = nextCols !== cols;
  cols = nextCols;
  return changed;
}

function placeCard(card) {
  const left = card.pos.x * wall.offsetWidth - cardW / 2;
  const top = card.pos.y * wall.offsetHeight - cardH / 2;
  card.el.style.left = `${Math.max(8, Math.min(wall.offsetWidth - cardW - 8, left))}px`;
  card.el.style.top = `${Math.max(8, Math.min(wall.offsetHeight - cardH - 8, top))}px`;
}

function pinOf(card) {
  return { x: card.el.offsetLeft + cardW / 2, y: card.el.offsetTop + 11 };
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function drawThread(thread) {
  const a = pinOf(cards[thread.from]);
  const b = pinOf(cards[thread.to]);
  for (const line of thread.lines) {
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
  }
  if (thread.label) {
    thread.label.style.left = `${(a.x + b.x) / 2}px`;
    thread.label.style.top = `${(a.y + b.y) / 2}px`;
  }
}

function buildThreads() {
  threadsSvg.replaceChildren();
  labels.replaceChildren();
  const pairs = cards.slice(1).map((_, i) => [i, i + 1]);
  if (cards.length > 4) pairs.push([0, cards.length - 2]);
  const phrases = shuffled(ACCUSATIONS);
  const labeled = MOBILE.matches ? MOBILE_LABELS : pairs.length;
  threads = pairs.map(([from, to], i) => {
    const group = svg("g", { class: "thread" });
    const lines = [svg("line"), svg("line", { class: "hit" })];
    group.append(...lines);
    threadsSvg.append(group);
    if (i >= labeled) return { from, to, lines };
    const label = Object.assign(document.createElement("span"), { className: "thread-label", textContent: phrases[i] });
    labels.append(label);
    return { from, to, lines, label };
  });
}

function redrawThreads(slot) {
  for (const t of threads) if (slot === undefined || t.from === slot || t.to === slot) drawThread(t);
}

function openExhibit(index) {
  const art = pool[index];
  const dialog = document.getElementById("exhibit");
  document.getElementById("exhibit-img").src = art.src;
  document.getElementById("exhibit-img").alt = art.tag;
  document.getElementById("exhibit-tag").textContent = `Exhibit ${index + 1}. ${art.tag}`;
  const link = Object.assign(document.createElement("a"), { href: art.post, textContent: art.author, target: "_blank", rel: "noopener" });
  document.getElementById("exhibit-credit").replaceChildren(`${{ by: "Drawn by", via: "Found via", "posted by": "Posted by" }[art.credit]} `, link, ".");
  dialog.showModal();
  if (!reducedMotion()) animate(dialog, [{ scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 220, easing: "cubic-bezier(.2,.9,.3,1.2)" });
  announce(`Exhibit ${index + 1}. Drawn at 3 a.m. Admissible.`);
}

function makeCard(index, slot) {
  const art = pool[index];
  const el = document.createElement("button");
  el.type = "button";
  el.className = "exhibit-card";
  el.setAttribute("aria-label", `Exhibit ${index + 1}: ${art.tag} By ${art.author}.`);
  const img = Object.assign(document.createElement("img"), { src: art.src, alt: "", draggable: false });
  const label = Object.assign(document.createElement("span"), { className: "label", textContent: `Exhibit ${index + 1}. ${art.author}` });
  el.append(Object.assign(document.createElement("span"), { className: "pin" }), img, label);
  el.style.rotate = `${(Math.random() - 0.5) * 6}deg`;
  const card = { el, index, pos: { x: 0, y: 0 } };
  bindCardDrag(card, slot);
  el.addEventListener("pointerenter", () => narrate(`Exhibit ${index + 1}. ${art.tag}`));
  el.addEventListener("focus", () => narrate(`Exhibit ${index + 1}. ${art.tag}`));
  el.addEventListener("click", () => {
    if (card.dragged) card.dragged = false;
    else openExhibit(index);
  });
  return card;
}

function bindCardDrag(card, slot) {
  let start = null;
  card.el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    if (e.pointerType === "touch") return;
    card.el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, left: card.el.offsetLeft, top: card.el.offsetTop, moved: false };
  });
  card.el.addEventListener("pointermove", (e) => {
    if (!start) return;
    const dx = (e.clientX - start.x) / zoom;
    const dy = (e.clientY - start.y) / zoom;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    start.moved = true;
    card.el.classList.add("is-dragging");
    card.pos = { x: (start.left + dx + cardW / 2) / wall.offsetWidth, y: (start.top + dy + cardH / 2) / wall.offsetHeight };
    placeCard(card);
    redrawThreads(slot);
  });
  card.el.addEventListener("pointerup", () => {
    if (!start) return;
    card.dragged = start.moved;
    start = null;
    card.el.classList.remove("is-dragging");
    if (!card.dragged) return;
    saveLayout();
    card.el.classList.remove("is-swinging");
    void card.el.offsetWidth;
    card.el.classList.add("is-swinging");
  });
}

function deal(indices, positions) {
  cards.forEach((c) => c.el.remove());
  cards = indices.map((index, slot) => makeCard(index, slot));
  wall.append(...cards.map((c) => c.el));
  const colsChanged = fit();
  fit();
  const layout = positions && !colsChanged ? positions : defaultLayout();
  cards.forEach((card, i) => {
    card.pos = layout[i];
    placeCard(card);
  });
  buildThreads();
  redrawThreads();
  saveLayout();
  if (reducedMotion()) return;
  cards.forEach((card, i) => animate(card.el, [{ opacity: 0, translate: "0 -40px" }, { opacity: 1, translate: "0 0" }], { duration: 260, delay: i * 50, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" }));
}

function bindPan() {
  let start = null;
  view.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    start = { x: e.clientX, y: e.clientY, left: view.scrollLeft, top: view.scrollTop };
    view.classList.add("is-panning");
  });
  window.addEventListener("pointermove", (e) => {
    if (!start) return;
    view.scrollLeft = start.left - (e.clientX - start.x);
    view.scrollTop = start.top - (e.clientY - start.y);
  });
  window.addEventListener("pointerup", () => {
    start = null;
    view.classList.remove("is-panning");
  });
}

function setZoom(next) {
  zoom = Math.max(0.5, Math.min(1.5, next));
  view.style.setProperty("--zoom", zoom);
}

function centerOn(card) {
  view.scrollTo({
    left: (card.el.offsetLeft + cardW / 2) * zoom - view.clientWidth / 2,
    top: (card.el.offsetTop + cardH / 2) * zoom - view.clientHeight / 2,
    behavior: "instant",
  });
}

function connectTheDots() {
  const button = document.getElementById("connect");
  button.disabled = true;
  let step = 0;
  const cut = () => {
    cards.forEach((c) => c.el.classList.remove("is-current"));
    if (step === cards.length) {
      document.removeEventListener("beat", cut);
      clearInterval(timer);
      button.disabled = false;
      announce("It all makes sense now. It doesn't.", 4000);
      return;
    }
    const card = cards[step++];
    card.el.classList.add("is-current");
    centerOn(card);
    if (!reducedMotion()) animate(card.el, [{ scale: 1.25 }, { scale: 1 }], { duration: 260, easing: "cubic-bezier(.2,.9,.3,1)" });
  };
  const timer = isRunning() ? 0 : setInterval(cut, 520);
  if (isRunning()) document.addEventListener("beat", cut);
  view.scrollIntoView({ block: "center", behavior: "instant" });
  cut();
}

export function initEvidence(list) {
  pool = list;
  view = document.getElementById("wall-view");
  wall = document.getElementById("wall");
  threadsSvg = document.getElementById("threads");
  labels = Object.assign(document.createElement("div"), { className: "thread-labels" });
  labels.setAttribute("aria-hidden", "true");
  wall.append(labels);
  if (!pool.length) {
    wall.append(Object.assign(document.createElement("p"), { className: "wall-empty", textContent: "No evidence yet. Put files in assets/fanart/ and list them in FANART in main.js." }));
    return;
  }
  const saved = savedLayout();
  if (saved) {
    deck = shuffled(pool.map((_, i) => i)).filter((i) => !saved.items.includes(i));
    deal(saved.items, saved.cols ? saved.pos : null);
  } else {
    deal(drawIndices(drawSize()));
  }
  bindPan();
  new ResizeObserver(() => {
    if (fit()) defaultLayout().forEach((pos, i) => { cards[i].pos = pos; });
    cards.forEach(placeCard);
    redrawThreads();
  }).observe(view);
  MOBILE.addEventListener("change", () => deal(drawIndices(drawSize())));
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + 0.25));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - 0.25));
  document.getElementById("connect").addEventListener("click", connectTheDots);
  document.getElementById("new-evidence").addEventListener("click", () => {
    deal(drawIndices(drawSize()));
    announce("New evidence. Same suspects. Fresh coffee.", 2500);
  });
}
