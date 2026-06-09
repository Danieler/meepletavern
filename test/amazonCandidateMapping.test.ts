import test from "node:test";
import assert from "node:assert/strict";
import { mapAmazonProductToCandidate } from "@/lib/amazon/mapAmazonProductToCandidate";

test("mapAmazonProductToCandidate cleans Amazon-style title noise", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B0BP8CMFZ7",
      title:
        "Zombicide: Undead or Alive Board Game Running Wild Expansion,Juego de Mesa de Estrategia,Juego cooperativo para Adultos,Juego de Mesa de Zombies,Tiempo de Juego Promedio 1 Hora,Hecho por CMON : Amazon.es: Juguetes y juegos",
      features: ["Juego cooperativo", "Miniaturas"],
      facts: {}
    },
    source: {
      status: "approved",
      permissions: {
        canUseMetadata: true,
        canUseImages: true,
        canUseDescriptions: true,
        canUsePrices: true,
        canStoreImagesLocally: true
      }
    },
    sourceUrl: "https://www.amazon.es/dp/B0BP8CMFZ7"
  });

  assert.equal(mapped.title, "Zombicide: Undead or Alive Board Game Running Wild Expansion");
  assert.deepEqual(mapped.candidateImages, []);
});
