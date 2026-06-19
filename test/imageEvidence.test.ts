import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImageDiagnostics,
  collectImageEvidence,
  imageEvidenceToCandidateImages,
  selectPublicImages
} from "@/lib/import/imageEvidence";

test("image evidence selects up to three public images and preserves attribution", () => {
  const evidence = collectImageEvidence([
    {
      source: { id: "source_a", name: "Dungeon Marvels", baseUrl: "https://dungeonmarvels.com" },
      publicImageUrls: [
        "https://dungeonmarvels.com/img/game-cover.jpg",
        "https://dungeonmarvels.com/img/game-back.jpg"
      ],
      candidate: {
        sourceUrl: "https://dungeonmarvels.com/game.html",
        title: "Game",
        originalTitle: null,
        metadata: {
          imageAllowed: true,
          rawData: {
            additionalImageUrls: ["https://dungeonmarvels.com/img/game-components.jpg"]
          }
        },
        extractedDescription: null,
        candidateImages: [
          {
            url: "https://dungeonmarvels.com/img/game-cover.jpg",
            type: "cover",
            sourceUrl: "https://dungeonmarvels.com/game.html"
          }
        ],
        confidence: 0.8,
        flags: []
      }
    },
    {
      source: { id: "source_b", name: "Juegos de la Mesa Redonda", baseUrl: "https://juegosdelamesaredonda.com" },
      publicImageUrls: [],
      candidate: {
        sourceUrl: "https://juegosdelamesaredonda.com/game.html",
        title: "Game",
        originalTitle: null,
        metadata: {
          imageAllowed: false
        },
        extractedDescription: null,
        candidateImages: [
          {
            url: "https://juegosdelamesaredonda.com/img/game.jpg",
            type: "cover",
            sourceUrl: "https://juegosdelamesaredonda.com/game.html"
          }
        ],
        confidence: 0.8,
        flags: []
      }
    }
  ]);

  const selected = selectPublicImages(evidence);
  const images = imageEvidenceToCandidateImages(selected);
  const diagnostics = buildImageDiagnostics(evidence, selected);

  assert.equal(selected.length, 3);
  assert.ok(selected.every((entry) => entry.allowedPublicUse));
  assert.deepEqual([...new Set(selected.map((entry) => entry.sourceName))], ["Dungeon Marvels"]);
  assert.equal(images[0]?.attribution, "Dungeon Marvels");
  assert.equal(diagnostics.totalFound, 4);
  assert.equal(diagnostics.publicSafeFound, 3);
  assert.equal(diagnostics.rejected.some((entry) => entry.sourceName === "Juegos de la Mesa Redonda"), true);
});
