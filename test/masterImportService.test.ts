import test from "node:test";
import assert from "node:assert/strict";
import { GameCandidateStatus, type GameOffer } from "@prisma/client";
import {
  MasterImportNoMatchError,
  MasterImportSourceError,
  buildMasterImportSearchQueries,
  createMasterImportService,
  type MasterImportInput
} from "@/lib/import/masterImportService";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";

process.env.MASTER_IMPORT_TAVILY_MODE = "off";
process.env.MASTER_IMPORT_BEDROCK_MODE = "off";
process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE = "off";

const SOURCE_A = { id: "source_a", name: "Juegos de la Mesa Redonda", baseUrl: "https://juegosdelamesaredonda.com" };
const SOURCE_B = { id: "source_b", name: "Dungeon Marvels", baseUrl: "https://dungeonmarvels.com" };
const SOURCE_C = { id: "source_c", name: "Amazon", baseUrl: "https://www.amazon.es" };
const SOURCE_D = { id: "source_d", name: "Dracotienda", baseUrl: "https://dracotienda.com" };
const SOURCE_E = { id: "source_e", name: "Zacatrus", baseUrl: "https://zacatrus.es" };

test("importAndEnrichGame agrega múltiples fuentes y usa la mejor oferta", async () => {
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
            title: "Azul",
            normalizedTitle: "azul",
            price: 29.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ],
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/azul.html",
            purchaseUrl: "https://dungeonmarvels.com/azul.html",
            title: "Azul",
            normalizedTitle: "azul",
            price: 27.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.92
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/azul.html": importedCandidate("Azul", SOURCE_A, {
          price: 29.95,
          availability: "En stock"
        }),
        "https://dungeonmarvels.com/azul.html": importedCandidate("Azul", SOURCE_B, {
          price: 27.95,
          availability: "En stock"
        })
      }
    })
  );

  const result = await service({
    title: "Azul"
  });

  assert.equal(result.title, "Azul");
  assert.equal(result.matchedSources.length, 2);
  assert.equal(result.offersCreated, 2);
  assert.equal(result.bestOffer?.price, 27.95);
  assert.equal(result.bestOffer?.sourceDisplayName, SOURCE_B.name);
});

test("importAndEnrichGame conserva ofertas de todas las fuentes coincidentes", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_B, SOURCE_C, SOURCE_D, SOURCE_E],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 62.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ],
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/ark-nova-castellano.html",
            purchaseUrl: "https://dungeonmarvels.com/ark-nova-castellano.html",
            title: "Ark Nova Castellano",
            normalizedTitle: "ark-nova-castellano",
            price: 59.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ],
        [SOURCE_D.id]: [
          searchResult({
            sourceName: "dracotienda",
            sourceDisplayName: SOURCE_D.name,
            sourceUrl: "https://dracotienda.com/ark-nova.html",
            purchaseUrl: "https://dracotienda.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 58.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://dracotienda.com/img/ark-nova.jpg",
            confidence: 0.88
          })
        ],
        [SOURCE_C.id]: [
          searchResult({
            sourceName: "amazon",
            sourceDisplayName: SOURCE_C.name,
            sourceUrl: "https://www.amazon.es/dp/B09L6FCP9S",
            purchaseUrl: "https://www.amazon.es/dp/B09L6FCP9S",
            title: "Feuerland Spiele Ark Nova | Juego de Mesa | A Partir de 14 años | 1-4 Jugadores | 90-150 Minutos de Tiempo de Juego",
            normalizedTitle: "feuerland-spiele-ark-nova-juego-de-mesa-a-partir-de-14-anos-1-4-jugadores-90-150-minutos-de-tiempo-de-juego",
            price: 64.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://m.media-amazon.com/images/I/ark-nova.jpg",
            confidence: 0.82
          })
        ],
        [SOURCE_E.id]: [
          searchResult({
            sourceName: "zacatrus",
            sourceDisplayName: SOURCE_E.name,
            sourceUrl: "https://zacatrus.es/ark-nova-mundos-marinos",
            purchaseUrl: "https://zacatrus.es/ark-nova-mundos-marinos",
            title: "Ark Nova Mundos Marinos",
            normalizedTitle: "ark-nova-mundos-marinos",
            price: 24.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.87
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_A, {
          price: 62.95,
          availability: "En stock"
        }),
        "https://dungeonmarvels.com/ark-nova-castellano.html": importedCandidate("Ark Nova Castellano", SOURCE_B, {
          price: 59.95,
          availability: "En stock"
        }),
        "https://dracotienda.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_D, {
          price: 58.95,
          availability: "En stock",
          imageUrl: "https://dracotienda.com/img/ark-nova.jpg"
        }),
        "https://www.amazon.es/dp/B09L6FCP9S": importedCandidate("Ark Nova", SOURCE_C, {
          price: 64.95,
          availability: "En stock",
          imageUrl: "https://m.media-amazon.com/images/I/ark-nova.jpg"
        })
      }
    })
  );

  const result = await service({ title: "Ark Nova" });

  assert.equal(result.matchedSources.length, 4);
  assert.equal(result.offersCreated, 4);
  assert.deepEqual(result.sourcesWithOffers.sort(), [SOURCE_A.name, SOURCE_B.name, SOURCE_C.name, SOURCE_D.name].sort());
  assert.ok(!result.sourcesWithOffers.includes(SOURCE_E.name));
  assert.equal(result.bestOffer?.price, 58.95);
});

test("importAndEnrichGame acepta una oferta de Amazon con prefijo de catálogo", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_C],
      searchResults: {
        [SOURCE_C.id]: [
          searchResult({
            sourceName: "amazon",
            sourceDisplayName: SOURCE_C.name,
            sourceUrl: "https://www.amazon.es/dp/B0DSFY4TH5",
            purchaseUrl: "https://www.amazon.es/dp/B0DSFY4TH5",
            title: "Feuerland Spiele Ark Nova | Juego de Mesa | A Partir de 14 años | 1-4 Jugadores | 90-150 Minutos de Tiempo de Juego",
            normalizedTitle: "feuerland-spiele-ark-nova-juego-de-mesa-a-partir-de-14-anos-1-4-jugadores-90-150-minutos-de-tiempo-de-juego",
            price: 64.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://m.media-amazon.com/images/I/ark-nova.jpg",
            confidence: 0.82
          })
        ]
      },
      importedByUrl: {
        "https://www.amazon.es/dp/B0DSFY4TH5": importedCandidate("Ark Nova", SOURCE_C, {
          price: 64.95,
          availability: "En stock",
          imageUrl: "https://m.media-amazon.com/images/I/ark-nova.jpg"
        })
      }
    })
  );

  const result = await service({ title: "Ark Nova" });

  assert.equal(result.offersCreated, 1);
  assert.deepEqual(result.sourcesWithOffers, [SOURCE_C.name]);
});

test("importAndEnrichGame acepta una oferta de Amazon para Cascadia con sufijo editorial en inglés", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_C],
      searchResults: {
        [SOURCE_C.id]: [
          searchResult({
            sourceName: "amazon",
            sourceDisplayName: SOURCE_C.name,
            sourceUrl: "https://www.amazon.es/dp/B093H8RGXX",
            purchaseUrl: "https://www.amazon.es/dp/B093H8RGXX",
            title: "Alderac Entertainment - Cascadia - Board Game - Base Game - For 1-4 Players - from Ages 10+ - English",
            normalizedTitle: "alderac-entertainment-cascadia-board-game-base-game-for-1-4-players-from-ages-10-english",
            price: 39.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://m.media-amazon.com/images/I/cascadia.jpg",
            confidence: 0.82
          })
        ]
      },
      importedByUrl: {
        "https://www.amazon.es/dp/B093H8RGXX": importedCandidate("Cascadia", SOURCE_C, {
          price: 39.95,
          availability: "En stock",
          imageUrl: "https://m.media-amazon.com/images/I/cascadia.jpg"
        })
      }
    })
  );

  const result = await service({ title: "Cascadia" });

  assert.equal(result.offersCreated, 1);
  assert.deepEqual(result.sourcesWithOffers, [SOURCE_C.name]);
});

test("importAndEnrichGame no deja que una expansión tape el precio del juego base", async () => {
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/ark-nova-mundos-marinos.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/ark-nova-mundos-marinos.html",
            title: "Ark Nova Mundos Marinos",
            normalizedTitle: "ark-nova-mundos-marinos",
            price: 24.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          }),
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 62.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ],
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/ark-nova.html",
            purchaseUrl: "https://dungeonmarvels.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 59.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_A, {
          price: 62.95,
          availability: "En stock"
        }),
        "https://dungeonmarvels.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_B, {
          price: 59.95,
          availability: "En stock"
        })
      }
    })
  );

  const result = await service({ title: "Ark Nova" });

  assert.equal(result.offersCreated, 2);
  assert.deepEqual(result.sourcesWithOffers.sort(), [SOURCE_A.name, SOURCE_B.name].sort());
  assert.equal(result.bestOffer?.price, 59.95);
});

test("importAndEnrichGame acepta variantes razonables de Virus y excluye secuelas", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_B, SOURCE_C, SOURCE_D, SOURCE_E],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/virus.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/virus.html",
            title: "¡Virus!",
            normalizedTitle: "virus",
            price: 11.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ],
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/virus-juego-de-cartas.html",
            purchaseUrl: "https://dungeonmarvels.com/virus-juego-de-cartas.html",
            title: "Virus juego de cartas",
            normalizedTitle: "virus-juego-de-cartas",
            price: 10.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.92
          })
        ],
        [SOURCE_D.id]: [
          searchResult({
            sourceName: "dracotienda",
            sourceDisplayName: SOURCE_D.name,
            sourceUrl: "https://dracotienda.com/virus.html",
            purchaseUrl: "https://dracotienda.com/virus.html",
            title: "Virus!",
            normalizedTitle: "virus",
            price: 9.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://dracotienda.com/img/virus.jpg",
            confidence: 0.9
          })
        ],
        [SOURCE_C.id]: [
          searchResult({
            sourceName: "amazon",
            sourceDisplayName: SOURCE_C.name,
            sourceUrl: "https://www.amazon.es/dp/8460659666",
            purchaseUrl: "https://www.amazon.es/dp/8460659666",
            title: "Tranjis games - Virus - Juego de cartas (TRG-01vir) (1138753.62)",
            normalizedTitle: "tranjis-games-virus-juego-de-cartas-trg-01vir-1138753-62",
            price: 14.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: "https://m.media-amazon.com/images/I/virus.jpg",
            confidence: 0.8
          })
        ],
        [SOURCE_E.id]: [
          searchResult({
            sourceName: "zacatrus",
            sourceDisplayName: SOURCE_E.name,
            sourceUrl: "https://zacatrus.es/virus-2-evolution",
            purchaseUrl: "https://zacatrus.es/virus-2-evolution",
            title: "Virus 2 Evolution",
            normalizedTitle: "virus-2-evolution",
            price: 13.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.89
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/virus.html": importedCandidate("¡Virus!", SOURCE_A, {
          price: 11.95,
          availability: "En stock"
        }),
        "https://dungeonmarvels.com/virus-juego-de-cartas.html": importedCandidate("Virus juego de cartas", SOURCE_B, {
          price: 10.95,
          availability: "En stock"
        }),
        "https://dracotienda.com/virus.html": importedCandidate("Virus!", SOURCE_D, {
          price: 9.95,
          availability: "En stock",
          imageUrl: "https://dracotienda.com/img/virus.jpg"
        }),
        "https://www.amazon.es/dp/8460659666": importedCandidate("Virus!", SOURCE_C, {
          price: 14.95,
          availability: "En stock",
          imageUrl: "https://m.media-amazon.com/images/I/virus.jpg"
        })
      }
    })
  );

  const result = await service({ title: "Virus" });

  assert.equal(result.offersCreated, 4);
  assert.deepEqual(result.sourcesWithOffers.sort(), [SOURCE_A.name, SOURCE_B.name, SOURCE_C.name, SOURCE_D.name].sort());
  assert.ok(!result.sourcesWithOffers.includes(SOURCE_E.name));
  assert.equal(result.bestOffer?.price, 9.95);
});

test("importAndEnrichGame continúa si una fuente falla", async () => {
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/pandemic.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/pandemic.html",
            title: "Pandemic",
            normalizedTitle: "pandemic",
            price: 31.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/pandemic.html": importedCandidate("Pandemic", SOURCE_A, {
          price: 31.95,
          availability: "En stock"
        })
      },
      failingSearchSources: [SOURCE_B.id]
    })
  );

  const result = await service({
    title: "Pandemic"
  });

  assert.equal(result.matchedSources.length, 1);
  assert.equal(result.failedSources.length, 1);
  assert.equal(result.failedSources[0]?.sourceName, SOURCE_B.name);
});

test("importAndEnrichGame no rompe con una fuente sin precio y la clasifica sin oferta útil", async () => {
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/arkham-horror.html",
            purchaseUrl: "https://dungeonmarvels.com/arkham-horror.html",
            title: "Arkham Horror LCG",
            normalizedTitle: "arkham-horror-lcg",
            price: null,
            currency: null,
            availability: null,
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.88
          })
        ]
      },
      importedByUrl: {
        "https://dungeonmarvels.com/arkham-horror.html": importedCandidate("Arkham Horror LCG", SOURCE_B, {})
      }
    })
  );

  const result = await service({
    title: "Arkham Horror LCG"
  });

  assert.equal(result.offersCreated, 1);
  assert.deepEqual(result.sourcesWithOffers, [SOURCE_B.name]);
});

test("importAndEnrichGame marca las fuentes sin resultados como no_match", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_B],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/cascadia.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/cascadia.html",
            title: "Cascadia",
            normalizedTitle: "cascadia",
            price: 28.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.94
          })
        ],
        [SOURCE_B.id]: []
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/cascadia.html": importedCandidate("Cascadia", SOURCE_A, {
          price: 28.95,
          availability: "En stock"
        })
      }
    })
  );

  const result = await service({ title: "Cascadia" });
  const noMatchDiagnostic = result.sourceDiagnostics.find((entry) => entry.sourceName === SOURCE_B.name);

  assert.equal(noMatchDiagnostic?.outcome, "no_match");
});

test("importAndEnrichGame marca fuentes no soportadas sin romper el lote", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_C],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
            title: "Azul",
            normalizedTitle: "azul",
            price: 29.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/azul.html": importedCandidate("Azul", SOURCE_A, {
          price: 29.95,
          availability: "En stock"
        })
      },
      unsupportedSources: [SOURCE_C.id]
    })
  );

  const result = await service({ title: "Azul" });
  const unsupportedDiagnostic = result.sourceDiagnostics.find((entry) => entry.sourceName === SOURCE_C.name);

  assert.equal(unsupportedDiagnostic?.outcome, "unsupported");
});

test("importAndEnrichGame usa update_existing cuando detecta candidato duplicado", async () => {
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
            title: "Azul",
            normalizedTitle: "azul",
            price: 29.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/azul.html": importedCandidate("Azul", SOURCE_A, {
          price: 29.95,
          availability: "En stock"
        })
      },
      duplicates: {
        exactCandidate: {
          id: "candidate_existing",
          sourceId: SOURCE_A.id,
          sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
          title: "Azul",
          originalTitle: null,
          metadata: {},
          extractedDescription: null,
          candidateImages: [],
          confidence: 0.7,
          status: GameCandidateStatus.pending,
          flags: [],
          gameId: null
        },
        candidateMatches: [],
        exactGame: null,
        gameMatches: []
      },
      persistedCandidate: {
        candidateId: "candidate_existing",
        gameId: null,
        action: "updated"
      }
    })
  );

  const result = await service({
    title: "Azul"
  });

  assert.equal(result.status, "update_existing");
  assert.equal(result.candidateId, "candidate_existing");
});

test("importAndEnrichGame asocia las ofertas persistidas al gameId final", async () => {
  const upsertCalls: Array<{ gameId: string | null; candidateId: string | null; sourceName: string }> = [];
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_D],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 62.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.95
          })
        ],
        [SOURCE_D.id]: [
          searchResult({
            sourceName: "dracotienda",
            sourceDisplayName: SOURCE_D.name,
            sourceUrl: "https://dracotienda.com/ark-nova.html",
            purchaseUrl: "https://dracotienda.com/ark-nova.html",
            title: "Ark Nova",
            normalizedTitle: "ark-nova",
            price: 58.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.91
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_A, {
          price: 62.95,
          availability: "En stock"
        }),
        "https://dracotienda.com/ark-nova.html": importedCandidate("Ark Nova", SOURCE_D, {
          price: 58.95,
          availability: "En stock"
        })
      },
      persistedCandidate: {
        candidateId: "candidate_new",
        gameId: "game_ark_nova",
        action: "created"
      },
      onUpsertOffer(input) {
        upsertCalls.push(input);
      }
    })
  );

  const result = await service({ title: "Ark Nova" });

  assert.equal(result.gameId, "game_ark_nova");
  assert.equal(upsertCalls.length, 2);
  assert.ok(upsertCalls.every((call) => call.gameId === "game_ark_nova"));
});

test("importAndEnrichGame respeta dryRun y no persiste", async () => {
  let persisted = 0;
  let offers = 0;
  const service = createMasterImportService(
    createDeps({
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/catan.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/catan.html",
            title: "Catan",
            normalizedTitle: "catan",
            price: 32.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/catan.html": importedCandidate("Catan", SOURCE_A, {
          price: 32.95,
          availability: "En stock"
        })
      },
      onPersistCandidate() {
        persisted += 1;
      },
      onUpsertOffer() {
        offers += 1;
      }
    })
  );

  const result = await service({
    title: "Catan",
    dryRun: true
  });

  assert.equal(result.candidateId, null);
  assert.equal(persisted, 0);
  assert.equal(offers, 0);
});

test("buildMasterImportSearchQueries añade variantes juego de mesa y sin apóstrofe", () => {
  assert.deepEqual(buildMasterImportSearchQueries("Earth"), ["Earth", "Earth juego de mesa", "Earth juego de tablero"]);
  assert.deepEqual(buildMasterImportSearchQueries("Can't Stop"), [
    "Can't Stop",
    "Cant Stop",
    "Can't Stop juego de mesa",
    "Can't Stop juego de tablero",
    "Cant Stop juego de mesa",
    "Cant Stop juego de tablero"
  ]);
  assert.deepEqual(buildMasterImportSearchQueries("Bang! El juego de dados").slice(0, 4), [
    "Bang! El juego de dados",
    "Bang El juego de dados",
    "Bang! The Dice Game",
    "Bang! Dice Game"
  ]);
});

test("importAndEnrichGame prueba variantes de búsqueda cuando la query exacta no encuentra match", async () => {
  const queries: string[] = [];
  const service = createMasterImportService({
    ...createDeps({
      sources: [SOURCE_A],
      importedByUrl: {
        "https://juegosdelamesaredonda.com/earth.html": importedCandidate("Earth", SOURCE_A, {
          price: 42.95,
          availability: "En stock"
        })
      }
    }),
    async searchSource(source, title) {
      queries.push(title);
      return {
        supported: true,
        results: title === "Earth juego de mesa"
          ? [
              searchResult({
                sourceName: "juegos_de_la_mesa_redonda",
                sourceDisplayName: source.name,
                sourceUrl: "https://juegosdelamesaredonda.com/earth.html",
                purchaseUrl: "https://juegosdelamesaredonda.com/earth.html",
                title: "Earth",
                normalizedTitle: "earth",
                price: 42.95,
                currency: "EUR",
                availability: "En stock",
                imageAllowed: false,
                imageUrl: null,
                confidence: 0.9
              })
            ]
          : []
      };
    }
  });

  const result = await service({ title: "Earth" });

  assert.deepEqual(queries, ["Earth", "Earth juego de mesa", "Earth juego de tablero"]);
  assert.equal(result.title, "Earth");
  assert.equal(result.offersCreated, 1);
});

test("importAndEnrichGame no corta la búsqueda al primer match y conserva resultados de variantes", async () => {
  const queries: string[] = [];
  const service = createMasterImportService({
    ...createDeps({
      sources: [SOURCE_A],
      importedByUrl: {
        "https://juegosdelamesaredonda.com/earth.html": importedCandidate("Earth", SOURCE_A, {
          price: 42.95,
          availability: "En stock"
        })
      }
    }),
    async searchSource(source, title) {
      queries.push(title);
      return {
        supported: true,
        results:
          title === "Earth"
            ? [
                searchResult({
                  sourceName: "juegos_de_la_mesa_redonda",
                  sourceDisplayName: source.name,
                  sourceUrl: "https://juegosdelamesaredonda.com/earth-abundancia.html",
                  purchaseUrl: "https://juegosdelamesaredonda.com/earth-abundancia.html",
                  title: "Earth: Abundancia",
                  normalizedTitle: "earth-abundancia",
                  price: 24.95,
                  currency: "EUR",
                  availability: "En stock",
                  imageAllowed: false,
                  imageUrl: null,
                  confidence: 0.95
                })
              ]
            : title === "Earth juego de tablero"
              ? [
                  searchResult({
                    sourceName: "juegos_de_la_mesa_redonda",
                    sourceDisplayName: source.name,
                    sourceUrl: "https://juegosdelamesaredonda.com/earth.html",
                    purchaseUrl: "https://juegosdelamesaredonda.com/earth.html",
                    title: "Earth",
                    normalizedTitle: "earth",
                    price: 42.95,
                    currency: "EUR",
                    availability: "En stock",
                    imageAllowed: false,
                    imageUrl: null,
                    confidence: 0.9
                  })
                ]
              : []
      };
    }
  });

  const result = await service({ title: "Earth" });

  assert.deepEqual(queries, ["Earth", "Earth juego de mesa", "Earth juego de tablero"]);
  assert.equal(result.title, "Earth");
  assert.equal(result.bestOffer?.price, 42.95);
});

test("importAndEnrichGame descarta precios agotados pero conserva sus imágenes públicas", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_B],
      searchResults: {
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: "https://dungeonmarvels.com/earth-castellano-73021.html",
            purchaseUrl: "https://dungeonmarvels.com/earth-castellano-73021.html",
            title: "Earth (Castellano)",
            normalizedTitle: "earth-castellano",
            price: 50,
            currency: "EUR",
            availability: "Agotado",
            imageAllowed: true,
            imageUrl: "https://dungeonmarvels.com/137272-large_default/earth-castellano.jpg",
            confidence: 0.94
          })
        ]
      },
      importedByUrl: {
        "https://dungeonmarvels.com/earth-castellano-73021.html": importedCandidate("Earth (Castellano)", SOURCE_B, {
          price: 45,
          availability: "Agotado",
          imageUrls: [
            "https://dungeonmarvels.com/137272-large_default/earth-castellano.jpg",
            "https://dungeonmarvels.com/137273-large_default/earth-castellano.jpg",
            "https://dungeonmarvels.com/137274-large_default/earth-castellano.jpg"
          ]
        })
      }
    })
  );

  const result = await service({ title: "Earth" });

  assert.equal(result.offersCreated, 0);
  assert.deepEqual(result.sourcesWithOffers, []);
  assert.deepEqual(result.sourcesWithoutOffers, [SOURCE_B.name]);
  assert.equal(result.bestOffer, null);
  assert.equal(result.imageDiagnostics.publicSafeFound, 3);
  assert.equal(result.imageDiagnostics.selectedAdditionalImages.length, 2);
});

test("importAndEnrichGame conserva precio de búsqueda si la ficha detallada pierde comercio disponible", async () => {
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A],
      searchResults: {
        [SOURCE_A.id]: [
          searchResult({
            sourceName: "juegos_de_la_mesa_redonda",
            sourceDisplayName: SOURCE_A.name,
            sourceUrl: "https://juegosdelamesaredonda.com/earth.html",
            purchaseUrl: "https://juegosdelamesaredonda.com/earth.html",
            title: "Earth",
            normalizedTitle: "earth",
            price: 42.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: false,
            imageUrl: null,
            confidence: 0.9
          })
        ]
      },
      importedByUrl: {
        "https://juegosdelamesaredonda.com/earth.html": importedCandidate("Earth", SOURCE_A, {
          availability: "En stock"
        })
      }
    })
  );

  const result = await service({ title: "Earth" });

  assert.equal(result.offersCreated, 1);
  assert.deepEqual(result.sourcesWithOffers, [SOURCE_A.name]);
  assert.equal(result.bestOffer?.price, 42.95);
});

test("el modo mixed continúa por título si la URL semilla no se puede importar", async () => {
  const selectedUrl = "https://juegosdelamesaredonda.com/cascadia-seleccionado.html";
  const matchedUrl = "https://dungeonmarvels.com/cascadia.html";
  const service = createMasterImportService(
    createDeps({
      sources: [SOURCE_A, SOURCE_B],
      searchResults: {
        [SOURCE_B.id]: [
          searchResult({
            sourceName: "dungeon_marvels",
            sourceDisplayName: SOURCE_B.name,
            sourceUrl: matchedUrl,
            purchaseUrl: matchedUrl,
            title: "Cascadia",
            normalizedTitle: "cascadia",
            price: 34.95,
            currency: "EUR",
            availability: "En stock",
            imageAllowed: true,
            imageUrl: null,
            confidence: 0.96
          })
        ]
      },
      importedByUrl: {
        [matchedUrl]: importedCandidate("Cascadia", SOURCE_B, {
          price: 34.95,
          availability: "En stock"
        })
      }
    })
  );

  const result = await service({
    title: "Cascadia",
    sourceUrl: selectedUrl,
    sourceName: SOURCE_A.name,
    mode: "mixed",
    allowCrossSourceSearch: true
  });

  assert.equal(result.title, "Cascadia");
  assert.ok(result.warnings.some((warning) => /se continuó buscando el mismo título/i.test(warning)));
});

test("identifica de forma tipada cuando ninguna fuente encuentra el juego", async () => {
  const service = createMasterImportService(createDeps({ sources: [SOURCE_A, SOURCE_B] }));

  await assert.rejects(
    () => service({ title: "Juego ausente" }),
    (error: unknown) => error instanceof MasterImportNoMatchError
  );
});

test("identifica de forma tipada una URL directa que la tienda no puede importar", async () => {
  const service = createMasterImportService(createDeps({ sources: [SOURCE_A] }));

  await assert.rejects(
    () => service({
      title: "Cascadia",
      sourceUrl: "https://juegosdelamesaredonda.com/cascadia.html",
      sourceName: SOURCE_A.name,
      mode: "url",
      allowCrossSourceSearch: false
    }),
    (error: unknown) => error instanceof MasterImportSourceError
  );
});

function createDeps(input: {
  sources?: Array<typeof SOURCE_A>;
  searchResults?: Record<string, ReturnType<typeof searchResult>[]>;
  importedByUrl?: Record<string, { candidate: NormalizedImportedCandidate; publicImageUrls: string[] }>;
  failingSearchSources?: string[];
  unsupportedSources?: string[];
  duplicates?: {
    exactCandidate: any;
    candidateMatches: any[];
    exactGame: any;
    gameMatches: any[];
  };
  persistedCandidate?: { candidateId: string; gameId: string | null; action: "created" | "updated" };
  onPersistCandidate?: () => void;
  onUpsertOffer?: (input: { sourceName: string; gameId: string | null; candidateId: string | null }) => void;
}) {
  return {
    async listSources() {
      return input.sources || [SOURCE_A, SOURCE_B, SOURCE_C];
    },
    async searchSource(source: typeof SOURCE_A, _title: string) {
      if (input.failingSearchSources?.includes(source.id)) {
        throw new Error(`Fallo en ${source.name}`);
      }

      if (input.unsupportedSources?.includes(source.id)) {
        return {
          supported: false,
          results: []
        };
      }

      if (!input.searchResults?.[source.id]) {
        return {
          supported: source.id !== SOURCE_C.id,
          results: []
        };
      }

      return {
        supported: true,
        results: input.searchResults[source.id]
      };
    },
    async importSourceUrl(_source: typeof SOURCE_A, sourceUrl: string) {
      const imported = input.importedByUrl?.[sourceUrl];
      if (!imported) {
        throw new Error(`URL no mockeada: ${sourceUrl}`);
      }

      return imported;
    },
    async findDuplicates() {
      return (
        input.duplicates || {
          exactCandidate: null,
          candidateMatches: [],
          exactGame: null,
          gameMatches: []
        }
      );
    },
    async persistCandidate() {
      input.onPersistCandidate?.();
      return (
        input.persistedCandidate || {
          candidateId: "candidate_new",
          gameId: null,
          action: "created"
        }
      );
    },
    async upsertOffer({ source, candidate, gameId, candidateId }: { source: typeof SOURCE_A; candidate: NormalizedImportedCandidate; gameId: string | null; candidateId: string | null }) {
      input.onUpsertOffer?.({
        sourceName: source.name,
        gameId,
        candidateId
      });
      const metadata = candidate.metadata as Record<string, unknown>;
      const hasOffer = typeof metadata.price === "number" || typeof metadata.availability === "string" || typeof metadata.purchaseUrl === "string";

      if (!hasOffer) {
        return {
          action: "skipped" as const,
          offer: null
        };
      }

      return {
        action: "created" as const,
        offer: {
          id: `${source.id}_offer`,
          gameId,
          candidateId,
          sourceId: source.id,
          sourceName: String(metadata.sourceName || source.name),
          sourceDisplayName: String(metadata.sourceDisplayName || source.name),
          storeName: String(metadata.storeName || source.name),
          titleAtSource: candidate.title,
          price: typeof metadata.price === "number" ? metadata.price : null,
          currency: typeof metadata.currency === "string" ? metadata.currency : null,
          availability: typeof metadata.availability === "string" ? metadata.availability : null,
          purchaseUrl: typeof metadata.purchaseUrl === "string" ? metadata.purchaseUrl : null,
          affiliateUrl: null,
          sourceUrl: candidate.sourceUrl,
          externalId: null,
          rawData: null,
          fetchedAt: new Date("2026-06-15T10:00:00.000Z"),
          createdAt: new Date("2026-06-15T10:00:00.000Z"),
          updatedAt: new Date("2026-06-15T10:00:00.000Z")
        } satisfies GameOffer
      };
    }
  };
}

function importedCandidate(
  title: string,
  source: typeof SOURCE_A,
  input: {
    price?: number;
    availability?: string;
    description?: string;
    imageUrl?: string;
    imageUrls?: string[];
  }
) {
  const sourceNameById: Record<string, "juegos_de_la_mesa_redonda" | "dungeon_marvels" | "amazon" | "dracotienda" | "zacatrus"> = {
    [SOURCE_A.id]: "juegos_de_la_mesa_redonda",
    [SOURCE_B.id]: "dungeon_marvels",
    [SOURCE_C.id]: "amazon",
    [SOURCE_D.id]: "dracotienda",
    [SOURCE_E.id]: "zacatrus"
  };
  const sourceName = sourceNameById[source.id] || "amazon";
  const slug = slugifyTitle(title);
  const sourceUrl = source.id === SOURCE_C.id
    ? `https://www.amazon.es/dp/${slug.replace(/-/g, "").slice(0, 10).toUpperCase().padEnd(10, "X")}`
    : `${source.baseUrl}/${slug}.html`;

  const imageUrls = input.imageUrls || (input.imageUrl ? [input.imageUrl] : []);

  return {
    candidate: {
      sourceUrl,
      title,
      originalTitle: null,
      metadata: {
        sourceName,
        sourceDisplayName: source.name,
        storeName: source.name,
        sourceUrlClean: sourceUrl,
        purchaseUrl: sourceUrl,
        cleanTitle: title,
        price: input.price ?? null,
        currency: input.price ? "EUR" : null,
        availability: input.availability ?? null,
        minPlayers: 2,
        maxPlayers: 4,
        minPlayTime: 30,
        maxPlayTime: 45,
        minAge: 8
      },
      extractedDescription: input.description || `${title} es un juego con información suficiente para validar el importador maestro y su agregación de fuentes.`,
      candidateImages: imageUrls.map((url, index) => ({
        url,
        type: index === 0 ? ("cover" as const) : ("component" as const),
        sourceUrl
      })),
      confidence: 0.84,
      flags: []
    },
    publicImageUrls: imageUrls
  };
}

function searchResult(input: {
  sourceName: "juegos_de_la_mesa_redonda" | "dungeon_marvels" | "amazon" | "dracotienda" | "zacatrus";
  sourceDisplayName: string;
  sourceUrl: string;
  title: string;
  normalizedTitle: string;
  price: number | null;
  currency: "EUR" | null;
  availability: string | null;
  purchaseUrl: string | null;
  imageAllowed: boolean;
  imageUrl: string | null;
  confidence: number;
}) {
  return {
    ...input,
    publisher: null,
    description: null,
    minPlayers: null,
    maxPlayers: null,
    minPlayTime: null,
    maxPlayTime: null,
    recommendedAge: null,
    language: null,
    rawData: {},
    fetchedAt: new Date("2026-06-15T10:00:00.000Z")
  };
}

function slugifyTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
