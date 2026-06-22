import test from "node:test";
import assert from "node:assert/strict";
import { getYouTubeVideoId, toYouTubeEmbedUrl } from "../lib/videos/youtube";

test("extracts supported YouTube video identifiers", () => {
  assert.equal(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("uses the privacy-enhanced YouTube domain", () => {
  assert.equal(
    toYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
  );
});

test("rejects unsupported hosts and malformed identifiers", () => {
  assert.equal(toYouTubeEmbedUrl("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=short"), null);
});
