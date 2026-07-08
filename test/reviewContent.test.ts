import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewContent } from "@/components/reviews/ReviewContent";
import { ReviewBodyEditor } from "@/components/reviews/ReviewBodyEditor";
import {
  getSafeReviewImageUrl,
  getSafeReviewLink,
  parseReviewContent,
  REVIEW_BODY_MAX_LENGTH,
  validateReviewContent
} from "@/lib/reviewContent";

test("parseReviewContent recognizes the small supported editing format", () => {
  const blocks = parseReviewContent(`## Sensaciones

Un juego **rápido** y _tenso_.

- Fácil de explicar
- Funciona a muchos jugadores

![Partida](https://images.example.com/partida.jpg)`);

  assert.deepEqual(blocks.map((block) => block.type), ["heading", "paragraph", "unordered-list", "image"]);
  assert.equal(blocks[3]?.type === "image" ? blocks[3].url : null, "https://images.example.com/partida.jpg");
});

test("review links and images only accept safe destinations", () => {
  assert.equal(getSafeReviewLink("/juegos/toma-6"), "/juegos/toma-6");
  assert.equal(getSafeReviewLink("javascript:alert(1)"), null);
  assert.equal(getSafeReviewImageUrl("data:image/svg+xml,test"), null);

  const html = renderToStaticMarkup(createElement(ReviewContent, {
    body: "## Título\n\nTexto **fuerte** con [enlace](https://example.com).\n\n![Mesa](https://example.com/mesa.jpg)"
  }));
  assert.match(html, /<h2/);
  assert.match(html, /<strong/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /javascript:/);
});

test("review content has a bounded persisted size", () => {
  assert.throws(
    () => validateReviewContent({ title: "Título", summary: "Resumen", body: "x".repeat(REVIEW_BODY_MAX_LENGTH + 1) }),
    /no puede superar/
  );
});

test("the lightweight editor exposes formatting, image and preview controls", () => {
  const html = renderToStaticMarkup(createElement(ReviewBodyEditor, {
    value: "Texto inicial",
    onChange: () => {},
    required: true
  }));

  assert.match(html, /aria-label="Negrita"/);
  assert.match(html, /aria-label="Imagen"/);
  assert.match(html, /Vista/);
  assert.match(html, /Dividir/);
  assert.match(html, /name="body"/);
});
