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
    sourceUrl: "https://www.amazon.es/dp/B0BP8CMFZ7"
  });

  assert.equal(mapped.title, "Zombicide: Undead or Alive Running Wild Expansion");
  assert.equal(mapped.sourceUrl, "https://www.amazon.es/dp/B0BP8CMFZ7");
  assert.deepEqual(mapped.candidateImages, []);
});

test("mapAmazonProductToCandidate extracts table data and normalizes Amazon age months", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B0FBH154N1",
      title: "CMON Zombicide White Death - Juego de Mesa Cooperativo, 1-6 Jugadores, 60 Minutos, A partir de 14 años",
      imageUrl: "https://m.media-amazon.com/images/I/example.jpg",
      facts: {
        "Edad mínima recomendada": "168",
        "Número de jugadores": "1-6",
        "Tiempo de juego estimado": "60 Minutos"
      }
    },
    sourceUrl: "https://www.amazon.es/CMON-Zombicide-Cooperativo-Jugadores-Minutos/dp/B0FBH154N1/ref=vse_cards_0"
  });

  assert.equal(mapped.title, "Zombicide: White Death");
  assert.equal(mapped.metadata.sourceUrlClean, "https://www.amazon.es/dp/B0FBH154N1");
  assert.equal(mapped.metadata.minPlayers, 1);
  assert.equal(mapped.metadata.maxPlayers, 6);
  assert.equal(mapped.metadata.minPlayTime, 60);
  assert.equal(mapped.metadata.maxPlayTime, 60);
  assert.equal(mapped.metadata.minAge, 14);
  assert.equal(mapped.extractedDescription, null);
  assert.deepEqual(mapped.flags, []);
  assert.equal(mapped.candidateImages[0]?.sourceUrl, "https://www.amazon.es/dp/B0FBH154N1");
});

test("mapAmazonProductToCandidate reads table labels before values", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B0TABLE001",
      title: "CMON Zombicide White Death",
      facts: {
        "Edad mínima recomendada": "168",
        "Número de jugadores": "1-6",
        "Tiempo de juego estimado": "60"
      }
    },
    sourceUrl: "https://www.amazon.es/dp/B0TABLE001"
  });

  assert.equal(mapped.metadata.minPlayers, 1);
  assert.equal(mapped.metadata.maxPlayers, 6);
  assert.equal(mapped.metadata.minPlayTime, 60);
  assert.equal(mapped.metadata.maxPlayTime, 60);
  assert.equal(mapped.metadata.minAge, 14);
});

test("mapAmazonProductToCandidate discards Amazon legal text from theme facts", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B092R6L3T3",
      title: "Los Hombres Lobo de Castronegro",
      facts: {
        Tema: "de seguridad de pagos encripta tu información durante la tra",
        "Número de jugadores": "8-18 jugadores"
      },
      features: ["Roles ocultos, aldeanos, noche, votación y acusaciones."]
    },
    sourceUrl: "https://www.amazon.es/dp/B092R6L3T3/ref=emc_bcc_2_i"
  });

  assert.equal((mapped.metadata.facts as Record<string, string>).Tema, undefined);
  assert.deepEqual(mapped.metadata.themeHints, ["Fiesta", "Roles ocultos", "Deducción"]);
  assert.ok((mapped.metadata.importWarnings as string[]).includes("Se descartó texto no relacionado con el juego detectado en Amazon."));
});
