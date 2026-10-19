import { announce } from "./caption.js";
import { reducedMotion } from "./motion.js";

const BASE_SPEED = 40;

function row(title, ...value) {
  const div = document.createElement("div");
  const dt = Object.assign(document.createElement("dt"), { textContent: title });
  const dd = document.createElement("dd");
  dd.append(...value);
  div.append(dt, Object.assign(document.createElement("span"), { className: "leader" }), dd);
  return div;
}

function group(title) {
  const div = document.createElement("div");
  div.append(Object.assign(document.createElement("dt"), { className: "group", textContent: title }));
  return div;
}

const link = (href, text) => Object.assign(document.createElement("a"), { href, textContent: text, target: "_blank", rel: "noopener" });

function findKing() {
  const king = document.getElementById("tiny-king");
  scrollTo({ top: document.documentElement.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  king.classList.remove("is-found");
  void king.offsetWidth;
  king.classList.add("is-found");
  announce("He was hiding in the footer the whole time.", 5000);
}

function buildBilling(fanart, memes) {
  const himself = Object.assign(document.createElement("button"), { type: "button", textContent: "himself" });
  himself.addEventListener("click", findKing);
  const artists = new Map();
  fanart.forEach((art, i) => {
    if (!artists.has(art.author)) artists.set(art.author, []);
    artists.get(art.author).push([art.post, `Exhibit ${i + 1}`]);
  });
  const signedMemes = memes.filter((m) => m.credit === "by");
  const postedMemes = memes.filter((m) => m.credit === "posted by");
  document.getElementById("billing").append(
    row("Directed by", "nobody, it's a fan site"),
    row("Hidden King", himself),
    row("Archmother", "declined to comment"),
    row("Vocals", link("https://www.youtube.com/watch?v=rwAg0klZlAA", "youreashotgun")),
    group("Fan art by"),
    ...[...artists].map(([author, posts]) => row(author, ...posts.flatMap(([href, label], i) => (i ? [", ", link(href, label)] : [link(href, label)])))),
    group("Memes"),
    ...signedMemes.map((m) => row(m.author, link(m.source, m.tag.split(".")[0]))),
    row("Unsigned memes", link("https://www.deadlockdaily.com/", "deadlockdaily.com")),
    group("Memes from r/DeadlockTheGame, posted by"),
    ...postedMemes.map((m) => row(m.author, link(m.source, m.tag.split(".")[0]))),
    row("Hero facts", link("https://deadlock.wiki/", "deadlock.wiki")),
    group("Also starring"),
    row("Hero portraits", link("https://deadlock-api.com", "deadlock-api.com")),
    row("Game", "Deadlock by Valve"),
  );
}

function runCrawl() {
  const crawl = document.getElementById("crawl");
  const roll = document.getElementById("roll");
  let y = crawl.clientHeight * 0.08;
  roll.style.transform = `translateY(${y}px)`;
  let speed = BASE_SPEED;
  let held = false;
  let visible = false;
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !held) {
      speed += (BASE_SPEED - speed) * dt * 0.8;
      y -= speed * dt;
      if (y < -roll.offsetHeight) y = crawl.clientHeight;
      if (y > crawl.clientHeight) y = -roll.offsetHeight + 1;
      roll.style.transform = `translateY(${y}px)`;
    }
    requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(crawl);
  crawl.addEventListener("wheel", (e) => {
    const box = crawl.getBoundingClientRect();
    if (box.top < 0 || box.bottom > innerHeight) return;
    e.preventDefault();
    speed = Math.max(-300, Math.min(600, speed + e.deltaY * 0.6));
  }, { passive: false });
  crawl.addEventListener("pointerdown", () => { held = true; });
  window.addEventListener("pointerup", () => { held = false; });
  crawl.addEventListener("focusin", (e) => { held = e.target !== crawl; });
  crawl.addEventListener("focusout", () => { held = false; });
  crawl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") speed += 60;
    if (e.key === "ArrowUp") speed -= 60;
  });
  requestAnimationFrame(frame);
}

export function initCredits(fanart, memes) {
  buildBilling(fanart, memes);
  if (reducedMotion()) {
    document.getElementById("crawl").classList.add("is-static");
    return;
  }
  runCrawl();
}
