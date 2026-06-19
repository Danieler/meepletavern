import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFieldEvidence,
  fieldDiagnosticsToMetadataPatch,
  resolveFieldEvidence
} from "@/lib/import/fieldEvidence";

test("field evidence keeps higher-confidence values and exposes alternatives", () => {
  const diagnostics = resolveFieldEvidence(
    buildFieldEvidence([
      {
        source: { name: "Fuente fiable" },
        confidence: 0.94,
        candidate: {
          sourceUrl: "https://source-a.example/game",
          title: "Earth",
          originalTitle: null,
          metadata: {
            publisher: "Inside Up Games",
            minPlayers: 1,
            maxPlayers: 5
          },
          extractedDescription: "Earth combina cartas, motor de recursos y ecosistemas con suficiente detalle para ser útil.",
          candidateImages: [],
          confidence: 0.94,
          flags: []
        }
      },
      {
        source: { name: "Fuente débil" },
        confidence: 0.52,
        candidate: {
          sourceUrl: "https://source-b.example/game",
          title: "Earth",
          originalTitle: null,
          metadata: {
            publisher: "Amazon",
            minPlayers: 2,
            maxPlayers: 4
          },
          extractedDescription: "Comprar ahora con envío rápido.",
          candidateImages: [],
          confidence: 0.52,
          flags: []
        }
      }
    ])
  );
  const patch = fieldDiagnosticsToMetadataPatch(diagnostics);

  assert.equal(patch.publisher, "Inside Up Games");
  assert.equal(patch.minPlayers, 1);
  assert.equal(patch.maxPlayers, 5);
  assert.equal(diagnostics.publisher.alternatives?.[0]?.value, "Amazon");
});
