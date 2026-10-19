import { initClock } from "./js/clock.js";
import { initCaption } from "./js/caption.js";
import { initFx } from "./js/fx.js";
import { initColdOpen } from "./js/coldopen.js";
import { initLineup } from "./js/lineup.js";
import { initEvidence } from "./js/evidence.js";
import { initLoreFake } from "./js/lorefake.js";
import { initCredits } from "./js/credits.js";
import { initEggs } from "./js/eggs.js";
import { MEMES, FACTS } from "./js/memes.js";
import { MEMES_WEB } from "./js/memes-web.js";

export const SONG = {
  provider: "youtube",
  id: "rwAg0klZlAA",
  offset: 0,
};

// shown as static text until data/sync.json provides word timings
export const CHORUS = [
  ["I'm", "the", "hidden", "king,", "yeah,", "yeah"],
  ["Do", "my", "fucking", "thing,", "yeah,", "yeah"],
];

const REDDIT = "https://www.reddit.com/r/DeadlockTheGame/comments/";

export const FANART = [
  { file: "abrams_super_punch.png", author: "R_Neophyte", post: REDDIT + "1fknpxe/", tag: "Abrams in heart boxers. The enemy team is now just boots." },
  { file: "battle_for_second_place.png", author: "u/videogamer9000", post: REDDIT + "1wxe9wi/", tag: "Danny, Solomon and Baba fighting for second place. Nobody asked about first." },
  { file: "billy_fun_words.png", author: "u/_Just_Art_", post: REDDIT + "1qv7kje/", tag: "Billy teaches Rem a fun word. Rem is a fast learner." },
  { file: "danny_every_dialogue.jpeg", author: "u/Hanna_Bjorn", post: REDDIT + "1x5yzin/", tag: "Deadman Danny, defending a multibillion dollar company in every voice line." },
  { file: "haze_havent_seen_all_game.jpeg", author: "Marsaline", post: REDDIT + "1frdy7w/", tag: "Haven't seen Haze all game. Found her. Bathroom mirror, selfie mode." },
  { file: "haze_mama_and_chud_son.jpeg", author: "Neitheyagi", post: REDDIT + "1x5vfra/", tag: "Bath time. Rem wants to keep playing with Rabies Ronnie." },
  { file: "haze_took_rem_to_park.png", author: "u/CertainDerision_33", post: REDDIT + "1wzeoh6/", tag: "Haze has no kid. Baba saw her at the park with the kid." },
  { file: "lash_being_an_ally.png", author: "u/Hanna_Bjorn", post: REDDIT + "1x5s5cr/", tag: "Lash on the hero vote. They should be kissing." },
  { file: "lash_giving_back.jpeg", author: "u/Hanna_Bjorn", post: REDDIT + "1wwjlup/", tag: "Lash visits a children's hospital. Brought his own merch." },
  { file: "mina_and_pocket.jpeg", author: "@sp777ns", post: REDDIT + "1t86sm0/", tag: "No reflection, still needs the hair dryer. Pocket complies." },
  { file: "mo_krill_zipline.png", author: "u/yamzxy", post: REDDIT + "1v9af1i/", tag: "Mo rides the zipline. Krill is the hook. Drawn in Paint, as is tradition." },
  { file: "paige_if_only_team_listened.png", author: "u/flamerenter", post: REDDIT + "1skssyh/", tag: "60 deaths. Paige has a theory about kung fu movies." },
  { file: "pillow_talk_of_the_town.png", author: "JH.Cubedman", post: REDDIT + "1x6kehl/", tag: "Rem reads everyone's dreams. Baba ordered the gossip." },
  { file: "ranked_does_to_a_mf.png", author: "u/Bernak_Obanders", post: REDDIT + "1g9k80o/", tag: "Post-ranked chat. Can't take it any Mo." },
  { file: "rem_stealing_sinners_solution.png", author: "Webby", post: REDDIT + "1qu6b03/", tag: "Rem keeps stealing creeps. Solution: a baby gate." },
  { file: "rem_wrong_tunnel.jpeg", author: "u/Hanna_Bjorn", post: REDDIT + "1wx3s6g/", tag: "Rem took the wrong tunnel. The Rat King has a candle." },
  { file: "victor_rizz_counter.png", author: "u/archfey13", post: REDDIT + "1wu8x5x/", tag: "Second prettiest corpse. Victor's got a lot going for him." },
  { file: "vindicta_got_caught.jpeg", author: "u/Hanna_Bjorn", post: REDDIT + "1wyrsra/", tag: "Vindicta, caught by every stun in the game at once. Anvil included." },
  { file: "vindicta_socks.png", author: "u/murtaugh4", post: REDDIT + "1rrwp0o/", tag: "Grim witch-trial ghost. Cat socks." },
  { file: "warden_lore_accurate.jpeg", author: "u/kapithedummy", post: REDDIT + "1w7hbay/", tag: "Everyone says good meowning. Warden hates this generation." },
];

initCaption(CHORUS);
initClock({ song: SONG, lines: CHORUS });
initFx();
initColdOpen(CHORUS[0]);
const ALL_MEMES = [
  ...MEMES.map((meme) => ({ ...meme, src: `assets/memes/${meme.file}`, credit: meme.author ? "by" : "via" })),
  ...MEMES_WEB.map((meme) => ({ ...meme, src: `assets/memes-web/${meme.file}`, credit: "posted by" })),
];

initLineup(ALL_MEMES, FACTS);
const exhibits = [
  ...FANART.map((art) => ({ ...art, src: `assets/fanart/${art.file}`, credit: "by" })),
  ...ALL_MEMES.map((meme) => ({ ...meme, post: meme.source, author: meme.author ?? "deadlockdaily.com" })),
];

initEvidence(exhibits);
initLoreFake();
initCredits(FANART, ALL_MEMES);
initEggs();
