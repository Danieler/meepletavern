import test from "node:test";
import assert from "node:assert/strict";
import { scoreHowToPlayVideoCandidate, selectHowToPlayVideos } from "@/lib/videos/howToPlayVideos";
import type { Game } from "@prisma/client";

const diceForge = {
  title: "Dice Forge",
  name: "Dice Forge",
  originalTitle: null,
  publisher: null
} as Pick<Game, "title" | "name" | "originalTitle" | "publisher">;

test("scoreHowToPlayVideoCandidate penaliza how-to-play en inglés frente a tutorial español", () => {
  const spanish = scoreHowToPlayVideoCandidate({
    title: "Dice Forge - ¿Cómo se juega? Tutorial en español",
    url: "https://www.youtube.com/watch?v=spanish",
    source: "YouTube"
  }, diceForge);
  const english = scoreHowToPlayVideoCandidate({
    title: "Dice Forge - How to Play and Playthrough",
    url: "https://www.youtube.com/watch?v=english",
    source: "YouTube"
  }, diceForge);

  assert.equal(spanish.confidence, "high");
  assert.ok(spanish.score > english.score);
  assert.equal(english.confidence, "low");
});

test("selectHowToPlayVideos prioriza señales españolas del título", () => {
  const selected = selectHowToPlayVideos([
    {
      title: "Dice Forge - How to Play and Playthrough",
      url: "https://www.youtube.com/watch?v=english",
      source: "YouTube"
    },
    {
      title: "Dice Forge - ¿Cómo se juega? Tutorial en español",
      url: "https://www.youtube.com/watch?v=spanish",
      source: "YouTube"
    }
  ], diceForge as Game);

  assert.equal(selected[0]?.url, "https://www.youtube.com/watch?v=spanish");
  assert.equal(selected[0]?.isPrimary, true);
});

test("selectHowToPlayVideos descarta variantes sospechosas del juego base", () => {
  const selected = selectHowToPlayVideos([
    {
      title: "Smash Up- Cómo se juega- Tu Turno",
      url: "https://www.youtube.com/watch?v=base",
      source: "YouTube"
    },
    {
      title: "How to Play SmashUp Disney Edition",
      url: "https://www.youtube.com/watch?v=disney",
      source: "YouTube"
    }
  ], {
    title: "Smash Up",
    name: "Smash Up",
    originalTitle: null,
    publisher: null
  } as Game);

  assert.deepEqual(selected.map((video) => video.url), ["https://www.youtube.com/watch?v=base"]);
});

test("selectHowToPlayVideos acepta tutorial oficial en inglés cuando no hay alternativa española", () => {
  const selected = selectHowToPlayVideos([
    {
      title: "Pigeon Explosion TUTORIAL",
      url: "https://www.youtube.com/watch?v=BJMHKcuUvRU",
      source: "Cranio Creations Uncut"
    }
  ], {
    title: "Pigeon Explosion",
    name: "Pigeon Explosion",
    originalTitle: null,
    publisher: "Tranjis Games"
  } as Game);

  assert.equal(selected[0]?.url, "https://www.youtube.com/watch?v=BJMHKcuUvRU");
  assert.equal(selected[0]?.confidence, "medium");
});
