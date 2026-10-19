import { play } from "./audio.js";
import { announce, narrate } from "./caption.js";
import { FAKE_LORE, LORE } from "./lore.js";
import { animate, reducedMotion } from "./motion.js";
import { SUSPECTS } from "./suspects.js";

const ROUNDS = 10;
const ACCENT_KEY = "hk.accent";
const RANKS = [
  [10, "Chief of Detectives. The King salutes you from hiding."],
  [8, "Lead Investigator. You read the wiki, didn't you."],
  [6, "Beat Cop With Potential. The potential is doing a lot of work."],
  [4, "Mall Security. You saw something. You said nothing useful."],
  [0, "Archmother's Informant. She thanks you for your service. The site is blue now."],
];
const root = document.documentElement;
const names = Object.fromEntries(SUSPECTS.map((s) => [s.slug, s.name]));

let ui;
let deck = [];
let card = null;
let round = 0;
let score = 0;
let streak = 0;
let best = 0;
let answered = false;
const seenThisGame = new Set();

function shuffledDeck() {
  const cards = [...LORE.map((c) => ({ ...c, fake: false })), ...FAKE_LORE.map((c) => ({ ...c, fake: true }))];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function applyAccent(blue, owner) {
  root.style.setProperty("--blue", `${blue}%`);
  if (owner) root.dataset.owner = owner;
  else delete root.dataset.owner;
}

export function restoreKing() {
  localStorage.removeItem(ACCENT_KEY);
  applyAccent(0, "");
  announce("The King is restored. The Archmother is drafting a complaint.", 4000);
}

function renderMeta() {
  ui.round.textContent = `Case ${Math.min(round, ROUNDS)} / ${ROUNDS}`;
  ui.score.textContent = `Score ${score}`;
  ui.streak.textContent = `Streak ${streak}`;
}

function deal() {
  if (!deck.length) deck = shuffledDeck().filter((c) => !seenThisGame.has(c.text));
  card = deck.pop();
  seenThisGame.add(card.text);
  round++;
  answered = false;
  ui.portrait.src = `assets/heroes/${card.hero}_card.png`;
  ui.name.textContent = names[card.hero];
  ui.quote.textContent = card.text;
  ui.truth.replaceChildren();
  ui.stamp.textContent = "";
  ui.stamp.className = "case-stamp";
  ui.next.hidden = true;
  ui.actions.hidden = false;
  renderMeta();
  if (!reducedMotion()) animate(ui.quote, [{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }], { duration: 260, easing: "ease-out" });
}

function stamp(text, isFake) {
  ui.stamp.textContent = text;
  ui.stamp.className = `case-stamp is-on ${isFake ? "is-fake" : "is-lore"}`;
  if (!reducedMotion()) animate(ui.stamp, [{ scale: 2.6, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 200, easing: "cubic-bezier(.5,0,.8,.5)" });
}

function answer(saysFake) {
  if (answered) return;
  answered = true;
  const right = saysFake === card.fake;
  score += right ? 1 : 0;
  streak = right ? streak + 1 : 0;
  best = Math.max(best, streak);
  play(right ? "orb" : "trombone");
  stamp(card.fake ? "Fake" : "Lore", card.fake);
  const verdict = right ? "Correct." : "Wrong.";
  if (card.fake) {
    ui.truth.replaceChildren(`${verdict} We made that one up. Valve would never. Probably.`);
  } else {
    const link = Object.assign(document.createElement("a"), { href: card.source, textContent: "Read the file on the wiki", target: "_blank", rel: "noopener" });
    ui.truth.replaceChildren(`${verdict} That's real lore. `, link, ".");
  }
  narrate(right ? `${verdict} Streak of ${streak}. Don't let it go to your head.` : `${verdict} The Archmother takes a note.`);
  ui.actions.hidden = true;
  ui.next.hidden = false;
  ui.next.textContent = round === ROUNDS ? "Close the case" : "Next exhibit";
  ui.next.focus({ preventScroll: true });
  renderMeta();
}

function finish() {
  const [, rank] = RANKS.find(([min]) => score >= min);
  ui.finalScore.textContent = score;
  ui.rank.textContent = rank;
  ui.best.textContent = `Best streak ${best}`;
  ui.card.hidden = true;
  ui.result.hidden = false;
  ui.again.focus({ preventScroll: true });
  if (!reducedMotion()) animate(ui.finalScore, [{ scale: 3, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 360, easing: "cubic-bezier(.3,1.4,.5,1)" });
  const lost = score < ROUNDS / 2;
  const blue = lost ? 100 : Math.round((1 - score / ROUNDS) * 100);
  applyAccent(blue, lost ? "archmother" : "");
  localStorage.setItem(ACCENT_KEY, JSON.stringify({ blue, owner: lost ? "archmother" : "" }));
  announce(lost ? "The Archmother owns this website now. Enjoy the blue." : "The King stays hidden. Good job, you.", 5000);
  round = ROUNDS + 1;
}

function next() {
  if (round === ROUNDS) return finish();
  deal();
  ui.lore.focus({ preventScroll: true });
}

function runItBack() {
  round = 0;
  score = 0;
  streak = 0;
  best = 0;
  seenThisGame.clear();
  ui.result.hidden = true;
  ui.card.hidden = false;
  next();
}

function isInView() {
  const box = ui.section.getBoundingClientRect();
  return box.top < innerHeight * 0.6 && box.bottom > innerHeight * 0.4;
}

export function initLoreFake() {
  const $ = (id) => document.getElementById(id);
  ui = {
    section: $("lore"), portrait: $("case-portrait"), name: $("case-name"), quote: $("case-quote"),
    round: $("case-round"), score: $("case-score"), streak: $("case-streak"), truth: $("case-truth"),
    stamp: $("case-stamp"), actions: $("case-actions"), lore: $("answer-lore"), fake: $("answer-fake"), next: $("case-next"),
    card: document.querySelector("#lore .case"), result: $("case-result"), finalScore: $("final-score"),
    rank: $("final-rank"), best: $("final-best"), again: $("case-again"),
  };
  const saved = JSON.parse(localStorage.getItem(ACCENT_KEY) || "null");
  if (saved) applyAccent(saved.blue, saved.owner);
  ui.lore.addEventListener("click", () => answer(false));
  ui.fake.addEventListener("click", () => answer(true));
  ui.next.addEventListener("click", next);
  ui.again.addEventListener("click", runItBack);
  document.getElementById("restore").addEventListener("click", restoreKing);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, select, dialog")) return;
    const inGame = ui.section.contains(document.activeElement);
    const key = e.key.toLowerCase();
    if (ui.card.hidden) return;
    if (!answered && (key === "l" || (inGame && key === "arrowleft")) && isInView()) answer(false);
    else if (!answered && (key === "f" || (inGame && key === "arrowright")) && isInView()) answer(true);
  });
  deal();
}
