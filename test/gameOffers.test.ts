import test from "node:test";
import assert from "node:assert/strict";
import type { GameOffer, Prisma } from "@prisma/client";
import { getBestOffer, normalizeStoreOffer, upsertStoreOfferRecord } from "@/lib/gameOffers";

test("normalizeStoreOffer normalizes Juegos de la Mesa Redonda offers with price", () => {
  const offer = normalizeStoreOffer(
    {
      sourceName: "juegos_de_la_mesa_redonda",
      sourceDisplayName: "Juegos de la Mesa Redonda",
      titleAtSource: "Azul",
      price: 28.95,
      availability: "En stock",
      purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
      sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
      fetchedAt: "2026-06-15T10:00:00.000Z"
    },
    {
      id: "src_jmdr",
      name: "Juegos de la Mesa Redonda",
      baseUrl: "https://juegosdelamesaredonda.com"
    }
  );

  assert.equal(offer?.sourceName, "juegos_de_la_mesa_redonda");
  assert.equal(offer?.price, 28.95);
  assert.equal(offer?.currency, "EUR");
  assert.equal(offer?.availability, "En stock");
});

test("normalizeStoreOffer descarta ofertas agotadas aunque tengan enlace", () => {
  const offer = normalizeStoreOffer(
    {
      sourceName: "dungeon_marvels",
      price: 45,
      availability: "Agotado",
      purchaseUrl: "https://dungeonmarvels.com/azul.html"
    },
    {
      id: "src_dm",
      name: "Dungeon Marvels",
      baseUrl: "https://dungeonmarvels.com"
    }
  );

  assert.equal(offer, null);
});

test("normalizeStoreOffer descarta precio sin disponibilidad confirmada salvo Amazon", () => {
  const noAvailability = normalizeStoreOffer(
    {
      sourceName: "dracotienda",
      price: 31.99,
      purchaseUrl: "https://dracotienda.com/azul.html"
    },
    {
      id: "src_draco",
      name: "Dracotienda",
      baseUrl: "https://dracotienda.com"
    }
  );
  const amazon = normalizeStoreOffer(
    {
      sourceName: "amazon",
      price: 44.99,
      purchaseUrl: "https://www.amazon.es/dp/B000000000"
    },
    {
      id: "src_amazon",
      name: "Amazon PA API España",
      baseUrl: "https://www.amazon.es"
    }
  );

  assert.equal(noAvailability, null);
  assert.equal(amazon?.availability, null);
  assert.equal(amazon?.price, 44.99);
});

test("upsertStoreOfferRecord creates an offer associated to a candidate and updates without duplicating", async () => {
  const db = createMockDb();

  const first = await upsertStoreOfferRecord(db, {
    candidateId: "candidate_1",
    source: {
      id: "source_1",
      name: "Juegos de la Mesa Redonda",
      baseUrl: "https://juegosdelamesaredonda.com"
    },
    offer: {
      sourceName: "juegos_de_la_mesa_redonda",
      titleAtSource: "Azul",
      price: 28.95,
      availability: "En stock",
      purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
      sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
      fetchedAt: "2026-06-15T10:00:00.000Z"
    }
  });

  const second = await upsertStoreOfferRecord(db, {
    candidateId: "candidate_1",
    source: {
      id: "source_1",
      name: "Juegos de la Mesa Redonda",
      baseUrl: "https://juegosdelamesaredonda.com"
    },
    offer: {
      sourceName: "juegos_de_la_mesa_redonda",
      titleAtSource: "Azul",
      price: 27.5,
      availability: "Últimas unidades",
      purchaseUrl: "https://juegosdelamesaredonda.com/azul.html",
      sourceUrl: "https://juegosdelamesaredonda.com/azul.html",
      fetchedAt: "2026-06-15T11:00:00.000Z"
    }
  });

  assert.equal(first?.candidateId, "candidate_1");
  assert.equal(db.offers.length, 1);
  assert.equal(second?.id, first?.id);
  assert.equal(second?.price, 27.5);
  assert.equal(second?.availability, "Últimas unidades");
});

test("getBestOffer chooses the lowest available price and ignores agotado offers when a better option exists", () => {
  const best = getBestOffer([
    offer({ price: 25.5, availability: "Agotado", purchaseUrl: "https://a.example/agotado" }),
    offer({ price: 29.95, availability: "En stock", purchaseUrl: "https://a.example/stock" }),
    offer({ price: 27.95, availability: "En stock", purchaseUrl: "https://a.example/mejor" })
  ]);

  assert.equal(best?.price, 27.95);
  assert.equal(best?.purchaseUrl, "https://a.example/mejor");
});

test("getBestOffer falls back to a valid purchase link when there is no price", () => {
  const best = getBestOffer([
    offer({ availability: "Agotado", purchaseUrl: "https://a.example/agotado" }),
    offer({ availability: null, purchaseUrl: "https://a.example/sin-precio" })
  ]);

  assert.equal(best?.purchaseUrl, "https://a.example/sin-precio");
});

function offer(input: Partial<GameOffer>): GameOffer {
  return {
    id: input.id || cryptoRandomId(),
    gameId: input.gameId || null,
    candidateId: input.candidateId || null,
    sourceId: input.sourceId || null,
    sourceName: input.sourceName || "source",
    sourceDisplayName: input.sourceDisplayName || null,
    storeName: input.storeName || null,
    titleAtSource: input.titleAtSource || null,
    price: typeof input.price === "number" ? input.price : null,
    currency: input.currency || null,
    availability: input.availability || null,
    purchaseUrl: input.purchaseUrl || null,
    affiliateUrl: input.affiliateUrl || null,
    sourceUrl: input.sourceUrl || null,
    externalId: input.externalId || null,
    rawData: input.rawData || null,
    fetchedAt: input.fetchedAt || new Date("2026-06-15T10:00:00.000Z"),
    createdAt: input.createdAt || new Date("2026-06-15T10:00:00.000Z"),
    updatedAt: input.updatedAt || new Date("2026-06-15T10:00:00.000Z")
  };
}

function createMockDb() {
  const offers: GameOffer[] = [];

  return {
    offers,
    gameOffer: {
      async findFirst(args: { where: Prisma.GameOfferWhereInput }) {
        return offers.find((item) => matchesWhere(item, args.where)) || null;
      },
      async findMany(args: { where: Prisma.GameOfferWhereInput }) {
        const or = Array.isArray(args.where.OR) ? args.where.OR : [];
        if (!or.length) {
          return offers.filter((item) => matchesWhere(item, args.where));
        }

        return offers.filter((item) => or.some((where) => matchesWhere(item, where as Prisma.GameOfferWhereInput)));
      },
      async create(args: { data: Prisma.GameOfferCreateInput | Prisma.GameOfferUncheckedCreateInput }) {
        const created = offer({
          ...(args.data as Partial<GameOffer>),
          id: cryptoRandomId()
        });
        offers.push(created);
        return created;
      },
      async update(args: { where: { id: string }; data: Prisma.GameOfferUpdateInput | Prisma.GameOfferUncheckedUpdateInput }) {
        const index = offers.findIndex((item) => item.id === args.where.id);
        if (index < 0) {
          throw new Error("Offer not found");
        }

        offers[index] = {
          ...offers[index],
          ...(args.data as Partial<GameOffer>),
          updatedAt: new Date("2026-06-15T12:00:00.000Z")
        };
        return offers[index];
      }
    }
  };
}

function matchesWhere(offerValue: GameOffer, where: Prisma.GameOfferWhereInput) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return false;
    }

    return offerValue[key as keyof GameOffer] === value;
  });
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}
