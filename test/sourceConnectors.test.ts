import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSearchResultsFromHtml,
  extractMasqueocaSuggestionsFromHtml,
  extractSearchResultsFromMarkdown,
  getStoreSourceConnector,
  mapStoreSourceResultToImportCandidate
} from "@/lib/import/sourceConnectors";

test("extractSearchResultsFromHtml parses Juegos de la Mesa Redonda search results", () => {
  const html = `
    <article class="product-miniature js-product-miniature">
      <div class="thumbnail-container">
        <a href="https://juegosdelamesaredonda.com/551-catan-el-juego-8436017220100.html">
          <img src="https://juegosdelamesaredonda.com/1126-home_default/catan-el-juego.jpg" data-full-size-image-url="https://juegosdelamesaredonda.com/1126-large_default/catan-el-juego.jpg">
        </a>
        <h3 class="h3 product-title">
          <a href="https://juegosdelamesaredonda.com/551-catan-el-juego-8436017220100.html">Catan</a>
        </h3>
        <div class="product-description-short">Juego de negociación y expansión.</div>
        <span class="price">42,95 €</span>
        <meta itemprop="name" content="Devir">
        <meta itemprop="availability" href="https://schema.org/InStock">
      </div>
    </article>
  `;

  const [result] = extractSearchResultsFromHtml(html, {
    sourceName: "juegos_de_la_mesa_redonda",
    sourceDisplayName: "Juegos de la Mesa Redonda",
    baseUrl: "https://juegosdelamesaredonda.com",
    searchTitle: "Catan",
    imageAllowed: false
  });

  assert.equal(result.title, "Catan");
  assert.equal(result.price, 42.95);
  assert.equal(result.currency, "EUR");
  assert.equal(result.publisher, "Devir");
  assert.equal(result.availability, "En stock");
  assert.equal(result.purchaseUrl, "https://juegosdelamesaredonda.com/551-catan-el-juego-8436017220100.html");
  assert.equal(result.imageAllowed, false);
  assert.equal(result.confidence, 1);
});

test("extractSearchResultsFromHtml parses Dungeon Marvels search results", () => {
  const html = `
    <article class="product-miniature js-product-miniature">
      <div class="thumbnail-container">
        <a href="https://dungeonmarvels.com/catan-123.html">
          <img src="https://dungeonmarvels.com/201971-home_default/catan.jpg" data-full-size-image-url="https://dungeonmarvels.com/201971-large_default/catan.jpg">
        </a>
        <h2 class="h3 product-title">
          <a href="https://dungeonmarvels.com/catan-123.html">Catan</a>
        </h2>
        <p class="product-description-short">Clásico de comercio y carreteras.</p>
        <span class="price">41,95 €</span>
        <meta itemprop="name" content="Devir">
        <span class="stock-msg reserva">Disponible en 3-10 días laborables</span>
      </div>
    </article>
  `;

  const [result] = extractSearchResultsFromHtml(html, {
    sourceName: "dungeon_marvels",
    sourceDisplayName: "Dungeon Marvels",
    baseUrl: "https://dungeonmarvels.com",
    searchTitle: "Catan",
    imageAllowed: true
  });

  assert.equal(result.title, "Catan");
  assert.equal(result.price, 41.95);
  assert.equal(result.publisher, "Devir");
  assert.equal(result.availability, "Disponible en 3-10 días laborables");
  assert.equal(result.imageAllowed, true);
  assert.equal(result.confidence, 1);
});

test("extractMasqueocaSuggestionsFromHtml parses MasQueOca suggestions", () => {
  const html = `
    <div class='suggestion-item' onclick="selectSuggestion('9024')">GREAT WESTERN TRAIL ARGENTINA</div>
    <div class='suggestion-item' onclick="selectSuggestion('10580')">GREAT WESTERN TRAIL EL PASO</div>
    <div class='suggestion-item' onclick="selectSuggestion('10647')">GREAT WESTERN TRAIL EL PASO LOSETAS EXCLUSIVAS LOS OLVIDADOS</div>
  `;

  const results = extractMasqueocaSuggestionsFromHtml(html, {
    sourceName: "masqueoca",
    sourceDisplayName: "MasQueOca",
    baseUrl: "https://www.masqueoca.com/tienda",
    searchTitle: "Great Western Trail El Paso",
    imageAllowed: true
  });

  assert.equal(results[0]?.title, "GREAT WESTERN TRAIL EL PASO");
  assert.equal(results[0]?.purchaseUrl, "https://www.masqueoca.com/tienda/producto.asp?item=10580");
  assert.equal(results[0]?.imageAllowed, true);
});

test("extractSearchResultsFromHtml parses Dracotienda search results with productName headings", () => {
  const html = `
    <article class="product-miniature js-product-miniature">
      <h2 class="productName" itemprop="name">
        <a href="https://dracotienda.com/juegos-de-tablero/25659-7-wonders-nueva-edicion.html">7 Wonders (Nueva edición)</a>
      </h2>
      <div class="laber-product-price-and-shipping">
        <span itemprop="price" class="price">43,19 €</span>
      </div>
    </article>
  `;

  const [result] = extractSearchResultsFromHtml(html, {
    sourceName: "dracotienda",
    sourceDisplayName: "Dracotienda",
    baseUrl: "https://dracotienda.com",
    searchTitle: "7 wonders",
    imageAllowed: false
  });

  assert.equal(result.title, "7 Wonders (Nueva edición)");
  assert.equal(result.price, 43.19);
  assert.equal(result.purchaseUrl, "https://dracotienda.com/juegos-de-tablero/25659-7-wonders-nueva-edicion.html");
  assert.equal(result.confidence, 0.9);
});

test("extractSearchResultsFromHtml falls back to JSON-LD ItemList", () => {
  const html = `
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "7 Wonders (2ª Edición)",
            "url": "https://mathom.es/es/7-wonders/44492-7-wonders-2-edicion.html"
          }
        ]
      }
    </script>
  `;

  const [result] = extractSearchResultsFromHtml(html, {
    sourceName: "mathom",
    sourceDisplayName: "Mathom",
    baseUrl: "https://mathom.es",
    searchTitle: "7 wonders",
    imageAllowed: false
  });

  assert.equal(result.title, "7 Wonders (2ª Edición)");
  assert.equal(result.purchaseUrl, "https://mathom.es/es/7-wonders/44492-7-wonders-2-edicion.html");
  assert.equal(result.price, null);
  assert.equal(result.confidence, 0.9);
});

test("extractSearchResultsFromMarkdown parses Zacatrus search results", () => {
  const markdown = `
# Resultados de busqueda para: 'Virus'

Articulos 1-24 de 28

1.   [![Image 5: Virus juego de cartas divertido para toda la familia](https://zacatrus.es/media/catalog/product/cache/2765542505660baab28ecd555e27366e/j/u/juego-virus.jpg)](https://zacatrus.es/virus.html)**[Virus](https://zacatrus.es/virus.html)**Valoracion:93%  [333 comentarios](https://zacatrus.es/virus.html#reviews)  13,46€ Anadir al carrito
2.   [![Image 7: Virus Deck Box la caja para guardar el juego Virus](https://zacatrus.es/media/catalog/product/cache/2765542505660baab28ecd555e27366e/v/i/virusdeckbox_caja.png)](https://zacatrus.es/virus-deck-box.html)**[Virus Deck Box](https://zacatrus.es/virus-deck-box.html)**Valoracion:96%  [10 comentarios](https://zacatrus.es/virus-deck-box.html#reviews)  7,16€ Anadir al carrito
3.   [![Image 9: Virus 2 Evolution es una expansion para el conocido juego de cartas Virus!](https://zacatrus.es/media/catalog/product/cache/2765542505660baab28ecd555e27366e/v/i/virus_2_evolution.jpg)](https://zacatrus.es/virus-2-evolution.html)**[Virus 2 Evolution](https://zacatrus.es/virus-2-evolution.html)**Valoracion:91%  [35 comentarios](https://zacatrus.es/virus-2-evolution.html#reviews)  11,95€ Anadir al carrito
  `;

  const results = extractSearchResultsFromMarkdown(markdown, {
    sourceName: "zacatrus",
    sourceDisplayName: "Zacatrus",
    baseUrl: "https://zacatrus.es",
    searchTitle: "Virus",
    imageAllowed: false
  });

  assert.equal(results[0]?.title, "Virus");
  assert.equal(results[0]?.price, 13.46);
  assert.equal(results[0]?.purchaseUrl, "https://zacatrus.es/virus.html");
  assert.equal(results[0]?.availability, null);
});

test("getStoreSourceConnector supports active configured store sources", () => {
  assert.equal(getStoreSourceConnector({ name: "Mathom", baseUrl: "https://mathom.es" })?.sourceName, "mathom");
  assert.equal(getStoreSourceConnector({ name: "Dracotienda", baseUrl: "https://dracotienda.com" })?.sourceName, "dracotienda");
  assert.equal(getStoreSourceConnector({ name: "Zacatrus", baseUrl: "https://zacatrus.es" })?.sourceName, "zacatrus");
  assert.equal(getStoreSourceConnector({ name: "MasQueOca", baseUrl: "https://www.masqueoca.com/tienda" })?.sourceName, "masqueoca");
});

test("Mathom, Dracotienda, Dungeon Marvels and MasQueOca connector images are allowed for master import", async () => {
  const mathom = getStoreSourceConnector({ name: "Mathom", baseUrl: "https://mathom.es" });
  const dracotienda = getStoreSourceConnector({ name: "Dracotienda", baseUrl: "https://dracotienda.com" });
  const dungeonMarvels = getStoreSourceConnector({ name: "Dungeon Marvels", baseUrl: "https://dungeonmarvels.com" });
  const masqueoca = getStoreSourceConnector({ name: "MasQueOca", baseUrl: "https://www.masqueoca.com/tienda" });

  const [mathomResult] = extractSearchResultsFromHtml(searchResultHtml("https://mathom.es/virus.html"), {
    sourceName: "mathom",
    sourceDisplayName: "Mathom",
    baseUrl: "https://mathom.es",
    searchTitle: "Virus",
    imageAllowed: Boolean(mathom?.imageAllowed)
  });
  const [dracotiendaResult] = extractSearchResultsFromHtml(searchResultHtml("https://dracotienda.com/virus.html"), {
    sourceName: "dracotienda",
    sourceDisplayName: "Dracotienda",
    baseUrl: "https://dracotienda.com",
    searchTitle: "Virus",
    imageAllowed: Boolean(dracotienda?.imageAllowed)
  });

  assert.equal(mathomResult.imageAllowed, true);
  assert.equal(dracotiendaResult.imageAllowed, true);
  assert.equal(dungeonMarvels?.imageAllowed, true);
  assert.equal(masqueoca?.imageAllowed, true);
});

test("mapStoreSourceResultToImportCandidate preserves image metadata but marks it as not allowed", () => {
  const candidate = mapStoreSourceResultToImportCandidate({
    sourceName: "juegos_de_la_mesa_redonda",
    sourceDisplayName: "Juegos de la Mesa Redonda",
    sourceUrl: "https://juegosdelamesaredonda.com/catan.html",
    title: "Catan",
    normalizedTitle: "catan",
    price: 42.95,
    currency: "EUR",
    availability: "En stock",
    purchaseUrl: "https://juegosdelamesaredonda.com/catan.html",
    publisher: "Devir",
    imageUrl: "https://juegosdelamesaredonda.com/catan.jpg",
    imageAllowed: false,
    description: "Juego de comercio.",
    minPlayers: 3,
    maxPlayers: 4,
    minPlayTime: 60,
    maxPlayTime: 90,
    recommendedAge: 10,
    language: "Castellano",
    rawData: {
      facts: {
        Idioma: "Castellano"
      },
      features: []
    },
    fetchedAt: new Date("2026-06-15T10:00:00.000Z")
  });

  assert.equal(candidate.candidateImages[0]?.url, "https://juegosdelamesaredonda.com/catan.jpg");
  assert.equal(candidate.metadata.imageAllowed, false);
});

test("mapStoreSourceResultToImportCandidate preserves multiple source page images", () => {
  const candidate = mapStoreSourceResultToImportCandidate({
    sourceName: "mathom",
    sourceDisplayName: "Mathom",
    sourceUrl: "https://mathom.es/es/virus/35978-virus-9788460659662.html",
    title: "Virus",
    normalizedTitle: "virus",
    price: 14.95,
    currency: "EUR",
    availability: "En stock",
    purchaseUrl: "https://mathom.es/es/virus/35978-virus-9788460659662.html",
    publisher: "Tranjis Games",
    imageUrl: "https://mathom.es/47508-large_default/virus.jpg",
    imageAllowed: true,
    description: "Compite por ser el primero en aislar un cuerpo sano.",
    minPlayers: 2,
    maxPlayers: 6,
    minPlayTime: 20,
    maxPlayTime: 20,
    recommendedAge: 8,
    language: "Castellano",
    rawData: {
      additionalImageUrls: [
        "https://mathom.es/47508-large_default/virus.jpg",
        "https://mathom.es/47509-large_default/virus.jpg"
      ],
      facts: {},
      features: []
    },
    fetchedAt: new Date("2026-06-15T10:00:00.000Z")
  });

  assert.deepEqual(candidate.candidateImages.map((image) => image.url), [
    "https://mathom.es/47508-large_default/virus.jpg",
    "https://mathom.es/47509-large_default/virus.jpg"
  ]);
  assert.equal(candidate.metadata.imageAllowed, true);
});

function searchResultHtml(url: string) {
  return `
    <article class="product-miniature js-product-miniature">
      <h2 class="productName" itemprop="name">
        <a href="${url}">Virus</a>
      </h2>
      <img src="${new URL("/virus.jpg", url).toString()}">
      <span class="price">14,95 €</span>
    </article>
  `;
}
