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

test("mapAmazonProductToCandidate normalizes Hasbro Risk marketplace title", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B01GG1BHQC",
      title:
        "Hasbro Gaming, Risk: El Juego de la Conquista Estratégica, Ejército de Juguete, Tablero Mundial, 42 Territorios, 6 Continentes, Estrategia, Juegos para Fiestas, Regalo Multijugador, Acción y Aventura",
      facts: {}
    },
    sourceUrl: "https://www.amazon.es/Hasbro-Gaming-B7404105-Games-Risk/dp/B01GG1BHQC"
  });

  assert.equal(mapped.title, "Risk");
  assert.equal(mapped.originalTitle, "Hasbro Gaming, Risk: El Juego de la Conquista Estratégica, Ejército de Juguete, Tablero Mundial, 42 Territorios, 6 Continentes, Estrategia, Juegos para Fiestas, Regalo Multijugador, Acción y Aventura");
  assert.equal(mapped.metadata.sourceUrlClean, "https://www.amazon.es/dp/B01GG1BHQC");
});

test("mapAmazonProductToCandidate recorta la marca en títulos tipo Cascadia", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B093H8RGXX",
      title: "Alderac Entertainment - Cascadia - Board Game - Base Game - For 1-4 Players - from Ages 10+ - English",
      facts: {}
    },
    sourceUrl: "https://www.amazon.es/dp/B093H8RGXX"
  });

  assert.equal(mapped.title, "Cascadia");
  assert.equal(mapped.originalTitle, "Alderac Entertainment - Cascadia - Board Game - Base Game - For 1-4 Players - from Ages 10+ - English");
});

test("mapAmazonProductToCandidate conserva el nombre real en Rummikub con título marketplace largo", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B07TLD2M71",
      title:
        "Rummikub Original 6 Jugadores, Juego De Mesa A Partir De 6 Años, Juegos De Mesa Adultos Y Niños, Juego Estratégico De Fichas, Juego De Números De Estrategia Para De 2 a 6 Jugadores : Amazon.es: Juguetes y juegos",
      imageUrl: "https://m.media-amazon.com/images/I/81CfzXQLByL._AC_SL1500_.jpg",
      price: 40.07,
      facts: {
        "Número de jugadores": "2-6",
        "Tiempo de juego": "20-40 minutos",
        "Descripción del rango de edad": "A partir de 6 años"
      }
    },
    sourceUrl: "https://www.amazon.es/dp/B07TLD2M71"
  });

  assert.equal(mapped.title, "Rummikub Original 6 Jugadores");
  assert.equal(mapped.metadata.price, 40.07);
  assert.equal(mapped.candidateImages[0]?.url, "https://m.media-amazon.com/images/I/81CfzXQLByL._AC_SL1500_.jpg");
});

test("mapAmazonProductToCandidate conserva Cluedo frente a cola comercial de Amazon", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B0CLUEDO01",
      title:
        "Cluedo Clásico Edición Refresh, Juego de Mesa de Misterio, Para 2-6 Jugadores, A Partir de 8 Años : Amazon.es: Juguetes y juegos",
      facts: {
        "Número de jugadores": "2-6",
        "Edad mínima recomendada": "8"
      }
    },
    sourceUrl: "https://www.amazon.es/dp/B0CLUEDO01"
  });

  assert.equal(mapped.title, "Cluedo Clásico Edición Refresh");
});

test("mapAmazonProductToCandidate limpia Cluedo Classico Refresh con paréntesis marketplace", () => {
  const mapped = mapAmazonProductToCandidate({
    product: {
      asin: "B0BQC62WHK",
      title:
        "Cluedo Classico Refresh (Juego en Caja, Hasbro Gaming), para niños y niñas a Partir de 8 años, Cluedo revisitado para 2-6 Jugadores",
      facts: {}
    },
    sourceUrl: "https://www.amazon.es/dp/B0BQC62WHK"
  });

  assert.equal(mapped.title, "Cluedo Clásico Refresh");
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
