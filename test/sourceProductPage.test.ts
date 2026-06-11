import test from "node:test";
import assert from "node:assert/strict";
import { extractSourcePageProductFromHtml } from "@/lib/import/sourceProductPage";

test("extractSourcePageProductFromHtml parses embedded PrestaShop product data", () => {
  const html = `
    <html>
      <head>
        <title>Zombicide: Invader</title>
        <meta property="og:image" content="https://dracotienda.com/147238-large_default/zombicide-invader.jpg">
        <meta property="product:price:amount" content="98.99">
        <meta property="product:price:currency" content="EUR">
        <meta property="brand" content="Edge Entertainment">
      </head>
      <body>
        <div class="product-description"><p><strong>Edición en castellano.</strong></p><p>Juego cooperativo con xenos, mapas y progresión.</p></div>
        <div id="product-details" data-product="{&quot;name&quot;:&quot;Zombicide: Invader&quot;,&quot;link&quot;:&quot;https:\/\/dracotienda.com\/juegos-de-tablero\/23666-zombicide-invader.html&quot;,&quot;description&quot;:&quot;&lt;p&gt;&lt;strong&gt;Edición en castellano.&lt;\/strong&gt;&lt;\/p&gt;&lt;p&gt;Juego cooperativo con xenos, mapas y progresión.&lt;\/p&gt;&quot;,&quot;price_amount&quot;:98.99,&quot;availability_message&quot;:&quot;Fuera de stock&quot;,&quot;category_name&quot;:&quot;Juegos de Tablero&quot;,&quot;cover&quot;:{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/dracotienda.com\/147238-large_default\/zombicide-invader.jpg&quot;}},&quot;images&quot;:[{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/dracotienda.com\/147238-large_default\/zombicide-invader.jpg&quot;}},{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/dracotienda.com\/147239-large_default\/zombicide-invader.jpg&quot;}}]}"></div>
      </body>
    </html>
  `;

  const product = extractSourcePageProductFromHtml(
    html,
    "https://dracotienda.com/juegos-de-tablero/23666-zombicide-invader.html"
  );

  assert.equal(product.platform, "prestashop");
  assert.equal(product.title, "Zombicide: Invader");
  assert.equal(product.description, "Edición en castellano. Juego cooperativo con xenos, mapas y progresión.");
  assert.equal(product.imageUrl, "https://dracotienda.com/147238-large_default/zombicide-invader.jpg");
  assert.equal(product.additionalImageUrls[1], "https://dracotienda.com/147239-large_default/zombicide-invader.jpg");
  assert.equal(product.brand, "Edge Entertainment");
  assert.equal(product.price, 98.99);
  assert.equal(product.currency, "EUR");
  assert.equal(product.availability, "Fuera de stock");
  assert.equal(product.sourceUrlClean, "https://dracotienda.com/juegos-de-tablero/23666-zombicide-invader.html");
});
