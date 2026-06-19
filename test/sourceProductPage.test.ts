import test from "node:test";
import assert from "node:assert/strict";
import { extractSourcePageProductFromHtml, extractSourcePageProductFromMarkdown } from "@/lib/import/sourceProductPage";

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

test("extractSourcePageProductFromHtml parses Dungeon Marvels product pages", () => {
  const html = `
    <html>
      <head>
        <link rel="canonical" href="https://dungeonmarvels.com/navegantes-de-catan-1018.html">
        <title>Navegantes de Catán Juego de Mesa | Dungeon Marvels</title>
        <meta name="description" content="Comprar Navegantes de Catán en oferta y al mejor precio.">
        <meta property="og:title" content="Navegantes de Catán Juego de Mesa | Dungeon Marvels">
        <meta property="og:site_name" content="Dungeon Marvels">
        <meta property="og:image" content="https://dungeonmarvels.com/201971-large_default/navegantes-de-catan.jpg">
        <meta property="product:price:amount" content="42.3">
        <meta property="product:price:currency" content="EUR">
      </head>
      <body>
        <div>
          Descripción
          Detalles del producto
          Opiniones
          Preguntas Frecuentes
          Después de colonizar la isla de Catán, sus habitantes deciden ir más allá y lanzarse a explorar el archipiélago en busca de nuevas aventuras.
          La expansión de Navegantes de Catán complementa el juego básico Los Colonos de Catán.
          Tiempo de juego:
          75 minutos
          Edad mínima:
          10 años
          Número de jugadores:
          2 - 4 jugadores
          Idiomas:
          Castellano
          Marca Devir
          Referencia BGNAVEGANTES
          Ficha técnica
          Disponibilidad
          En stock
          Información sobre el distribuidor y fabricante
        </div>
      </body>
    </html>
  `;

  const product = extractSourcePageProductFromHtml(
    html,
    "https://dungeonmarvels.com/navegantes-de-catan-1018.html"
  );

  assert.equal(product.platform, "generic");
  assert.equal(product.title, "Navegantes de Catán");
  assert.equal(
    product.description,
    "Después de colonizar la isla de Catán, sus habitantes deciden ir más allá y lanzarse a explorar el archipiélago en busca de nuevas aventuras. La expansión de Navegantes de Catán complementa el juego básico Los Colonos de Catán."
  );
  assert.equal(product.imageUrl, "https://dungeonmarvels.com/201971-large_default/navegantes-de-catan.jpg");
  assert.equal(product.price, 42.3);
  assert.equal(product.currency, "EUR");
  assert.equal(product.brand, "Devir");
  assert.equal(product.publisher, "Devir");
  assert.equal(product.availability, "En stock");
  assert.equal(product.sourceUrlClean, "https://dungeonmarvels.com/navegantes-de-catan-1018.html");
  assert.equal(product.facts["Tiempo de juego"], "75 minutos");
  assert.equal(product.facts["Edad mínima"], "10 años");
  assert.equal(product.facts["Número de jugadores"], "2 - 4 jugadores");
  assert.equal(product.facts.Idiomas, "Castellano");
});

test("extractSourcePageProductFromHtml parses Juegos de la Mesa Redonda product pages with JSON-LD", () => {
  const html = `
    <html>
      <head>
        <link rel="canonical" href="https://juegosdelamesaredonda.com/18451-codigo-secreto-regreso-a-hogwarts-8436625610409.html">
        <title>Compra Código Secreto: Regreso a Hogwarts - Juego de Cartas - Juegos de la Mesa Redonda</title>
        <meta property="og:site_name" content="Juegos de la Mesa Redonda">
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Código Secreto: Regreso a Hogwarts",
            "description": "Un juego cooperativo de palabras ambientado en Hogwarts.",
            "image": [
              "https://juegosdelamesaredonda.com/55029-large_default/codigo-secreto-regreso-a-hogwarts.jpg"
            ],
            "brand": { "@type": "Brand", "name": "Asmodee" },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "EUR",
              "price": "22.95",
              "availability": "https://schema.org/InStock",
              "url": "https://juegosdelamesaredonda.com/18451-codigo-secreto-regreso-a-hogwarts-8436625610409.html"
            }
          }
        </script>
      </head>
      <body>
        <div>
          Descripción
          Un juego cooperativo de palabras ambientado en Hogwarts.
          Número de jugadores:
          2 - 8 jugadores
          Duración aproximada:
          30 minutos
          Edad mínima:
          11 años
          Idioma:
          Castellano
          Marca
          Asmodee
        </div>
      </body>
    </html>
  `;

  const product = extractSourcePageProductFromHtml(
    html,
    "https://juegosdelamesaredonda.com/18451-codigo-secreto-regreso-a-hogwarts-8436625610409.html"
  );

  assert.equal(product.platform, "generic");
  assert.equal(product.title, "Código Secreto: Regreso a Hogwarts");
  assert.equal(product.description, "Un juego cooperativo de palabras ambientado en Hogwarts.");
  assert.equal(product.imageUrl, "https://juegosdelamesaredonda.com/55029-large_default/codigo-secreto-regreso-a-hogwarts.jpg");
  assert.equal(product.price, 22.95);
  assert.equal(product.currency, "EUR");
  assert.equal(product.brand, "Asmodee");
  assert.equal(product.publisher, "Asmodee");
  assert.equal(product.availability, "InStock");
  assert.equal(product.sourceUrlClean, "https://juegosdelamesaredonda.com/18451-codigo-secreto-regreso-a-hogwarts-8436625610409.html");
  assert.equal(product.facts["Número de jugadores"], "2 - 8 jugadores");
  assert.equal(product.facts["Tiempo de juego"], "30 minutos");
  assert.equal(product.facts["Edad mínima"], "11 años");
  assert.equal(product.facts.Idiomas, "Castellano");
});

test("extractSourcePageProductFromHtml parses Mathom product pages", () => {
  const html = `
    <html>
      <head>
        <link rel="canonical" href="https://mathom.es/es/heat/49719-heat-824968091814.html">
        <title>Heat - Mathom</title>
        <meta property="og:title" content="Heat">
        <meta property="og:site_name" content="Mathom">
        <meta property="og:image" content="https://mathom.es/60656-large_default/heat.jpg">
        <meta property="product:price:amount" content="57.19">
        <meta property="product:price:currency" content="EUR">
      </head>
      <body>
        <div class="product-description">
          <p>Heat es un juego de carreras con toma de riesgos, mejora del coche y modo campeonato.</p>
        </div>
        <div
          data-product="{&quot;name&quot;:&quot;Heat&quot;,&quot;link&quot;:&quot;https:\/\/mathom.es\/es\/heat\/49719-heat-824968091814.html&quot;,&quot;description&quot;:&quot;&lt;p&gt;Heat es un juego de carreras con toma de riesgos, mejora del coche y modo campeonato.&lt;\/p&gt;&quot;,&quot;price_amount&quot;:57.19,&quot;availability&quot;:&quot;available&quot;,&quot;category_name&quot;:&quot;Heat&quot;,&quot;cover&quot;:{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/mathom.es\/60656-large_default\/heat.jpg&quot;}},&quot;images&quot;:[{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/mathom.es\/60656-large_default\/heat.jpg&quot;}},{&quot;large&quot;:{&quot;url&quot;:&quot;https:\/\/mathom.es\/60657-large_default\/heat.jpg&quot;}}],&quot;features&quot;:[{&quot;name&quot;:&quot;Idioma&quot;,&quot;value&quot;:&quot;Castellano&quot;},{&quot;name&quot;:&quot;N\u00famero Jugadores&quot;,&quot;value&quot;:&quot;1-6&quot;},{&quot;name&quot;:&quot;Edad m\u00ednima recomendada&quot;,&quot;value&quot;:&quot;10+&quot;},{&quot;name&quot;:&quot;Duraci\u00f3n&quot;,&quot;value&quot;:&quot;45-60 minutos&quot;},{&quot;name&quot;:&quot;Editorial&quot;,&quot;value&quot;:&quot;Days of Wonder&quot;}]}">
        </div>
      </body>
    </html>
  `;

  const product = extractSourcePageProductFromHtml(
    html,
    "https://mathom.es/es/heat/49719-heat-824968091814.html"
  );

  assert.equal(product.platform, "prestashop");
  assert.equal(product.title, "Heat");
  assert.equal(product.description, "Heat es un juego de carreras con toma de riesgos, mejora del coche y modo campeonato.");
  assert.equal(product.imageUrl, "https://mathom.es/60656-large_default/heat.jpg");
  assert.equal(product.additionalImageUrls[1], "https://mathom.es/60657-large_default/heat.jpg");
  assert.equal(product.price, 57.19);
  assert.equal(product.currency, "EUR");
  assert.equal(product.brand, "Days of Wonder");
  assert.equal(product.publisher, "Days of Wonder");
  assert.equal(product.sourceUrlClean, "https://mathom.es/es/heat/49719-heat-824968091814.html");
  assert.equal(product.facts.Idioma, "Castellano");
  assert.equal(product.facts["Número Jugadores"], "1-6");
  assert.equal(product.facts["Edad mínima recomendada"], "10+");
  assert.equal(product.facts.Duración, "45-60 minutos");
  assert.equal(product.facts.Editorial, "Days of Wonder");
});

test("extractSourcePageProductFromHtml parses MasQueOca product pages", () => {
  const html = `
    <html>
      <head>
        <title>Juegos de mesa MasQueOca.com. Tu Tienda de Juegos de Mesa, Cartas, Wargames y Estrategia</title>
        <script>
          function doPopUp(){
            doPopUpWindow = window.open("productoimg.asp?img=%img%","MásQueOca","width=650,height=530");
          }
          function doPopUp2(){
            doPopUpWindow = window.open("productoimg.asp?img=GWT-el-paso.jpg","MásQueOca","width=650,height=530");
          }
        </script>
      </head>
      <body>
        <span>FICHA DEL JUEGO</span>
        <div style="padding-top: 10px;">
          <div style="float: left;">
            <a href="javascript:doPopUp2()"><img border="0" src="imagesjuegos/GWT-el-paso_th.jpg" alt="Great Western Trail El Paso" /></a>
          </div>
          <div style="padding-left: 15px; float: left; width: 35%;">
            <div style="font-size: 15px; font-weight: bolder;">
              <a href="producto.asp?item=10580&tit=Great-Western-Trail-El-Paso">Great Western Trail El Paso</a>
              <br>
              <span style="font-size:13px;">de <a href="buscardo.asp?ideditor=143&ls=1&stockneg=1&vertodo=1" class="txt_4">Ediciones MasQueOca</a></span>
            </div>
            <div><b>Precio:</b> <img valign="bottom" src="images/oferta.gif" width="37" height="14"><br>34,99 &euro; - 20% = <b>27,99</b> &euro;</div>
          </div>
          <div style="float: left; background-color: #eee; width: 25%;" class="vc_hidden-xs">
            <img src="images/leyenda_edad12.svg" alt="a partir de 12 a&ntilde;os" />
            <img src="images/leyenda_tiempo60.svg" alt="unos 60 minutos" />
            <img src="images/leyenda_njug1.svg" alt="1 jugadores m&iacute;nimos" />
            <img src="images/leyenda_njug4.svg" alt="4 jugadores m&aacute;ximos" />
          </div>
          <div style="float: left;">
            <div style="padding-left:15px;"><img src="images/activo1.gif" width="64" height="36"><!--DISPONIBILIDAD--></div>
          </div>
        </div>
        <div class="collapse" id="estado-stock"></div>
        <table width="100%">
          <tr>
            <td>
              <div align="justify">
                <br>
                <div align="center">Great Western Trail El Paso<br><br><b>Edici&oacute;n &iacute;ntegra en Espa&ntilde;ol</b><br><br>&iexcl;Una versi&oacute;n reducida de los cl&aacute;sicos, con toda su profundidad estrat&eacute;gica!<br><br><i>El Paso, finales del siglo XIX. Cinco compa&ntilde;&iacute;as ferroviarias han incorporado la &laquo;Ciudad del Sol&raquo; a sus redes.</i><br><br><div align="center"><a href="https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso_tb.jpg" target="_blank"><img src="imagesjuegos/GWT-el-paso_tba.jpg"></a></div><br><br>En tu turno, mover&aacute;s a tu ganadero por una ruta circular.<br><br><div align="center"><a href="https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso_tb1.jpg" target="_blank"><img src="imagesjuegos/GWT-el-paso_tb1a.jpg"></a></div><br><br><b>Contenido:</b><br><br>&bull; 1 tablero de juego<br>&bull; 1 reglamento<br></div><br>
              </div>
              <table id="reqexprel"></table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const product = extractSourcePageProductFromHtml(
    html,
    "https://www.masqueoca.com/tienda/producto.asp?item=10580&tit=Great-Western-Trail-El-Paso"
  );

  assert.equal(product.platform, "generic");
  assert.equal(product.title, "Great Western Trail El Paso");
  assert.equal(product.brand, "Ediciones MasQueOca");
  assert.equal(product.publisher, "Ediciones MasQueOca");
  assert.equal(product.price, 27.99);
  assert.equal(product.currency, "EUR");
  assert.equal(product.availability, "En stock");
  assert.equal(product.imageUrl, "https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso.jpg");
  assert.deepEqual(product.additionalImageUrls, [
    "https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso.jpg",
    "https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso_tb.jpg",
    "https://www.masqueoca.com/tienda/productoimg.asp?img=GWT-el-paso_tb1.jpg"
  ]);
  assert.equal(product.facts["Edad mínima"], "12 años");
  assert.equal(product.facts["Tiempo de juego"], "60 minutos");
  assert.equal(product.facts["Número de jugadores"], "1 - 4 jugadores");
  assert.equal(product.sourceUrlClean, "https://www.masqueoca.com/tienda/producto.asp?item=10580&tit=Great-Western-Trail-El-Paso");
  assert.match(product.description || "", /Ciudad del Sol/);
});

test("extractSourcePageProductFromMarkdown parses Zacatrus product pages", () => {
  const markdown = `
# Loops (La Trampa) - Juegos de Cartas - Zacatrus

Envío a domicilio gratis en pedidos de más de 50 €

![Image 7: Loops](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/l/o/loops_2.jpg)
![Image 8: Loops](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/l/o/loops-juego.jpg)

# Loops

Llegada estimada: **mañana**

11,95€

¡Loops es un juego de mesa sin libro de reglas! Acompaña a Andrea en una original aventura por el Barrio Gris.

Ficha técnica

Si buscas...

Familiares, Solitario, Para 2, Experiencia, Narrativo

Núm. jugadores

1, 2

Tiempo de juego

90 - 120 min.

Autor

Arnau Cintas Grau

Mecánica

Exploración y Aventura

Temática

Urbano

Edad

de 10 a 14 años, de 14 a 18 años, más de 18 años

Editorial

Zacatrus

Idioma

Español

Dependencia del idioma

Alta

[Detalles](https://zacatrus.es/loops.html#description)

Loops presenta un innovador sistema de juego sin libro de reglas. Toda la información necesaria está en las cartas.

En Loops una o dos personas vivirán una aventura ambientada en un universo propio.

[Reseñas 9](https://zacatrus.es/loops.html#reviews)
  `;

  const product = extractSourcePageProductFromMarkdown(markdown, "https://zacatrus.es/loops.html");

  assert.equal(product.platform, "generic");
  assert.equal(product.title, "Loops");
  assert.equal(product.imageUrl, "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/l/o/loops_2.jpg");
  assert.equal(product.additionalImageUrls[1], "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/l/o/loops-juego.jpg");
  assert.equal(product.price, 11.95);
  assert.equal(product.currency, "EUR");
  assert.equal(product.availability, "Disponible (mañana)");
  assert.equal(product.brand, "Zacatrus");
  assert.equal(product.publisher, "Zacatrus");
  assert.equal(product.description, "Loops presenta un innovador sistema de juego sin libro de reglas. Toda la información necesaria está en las cartas. En Loops una o dos personas vivirán una aventura ambientada en un universo propio.");
  assert.equal(product.facts["Número de jugadores"], "1 - 2 jugadores");
  assert.equal(product.facts["Tiempo de juego"], "90 - 120 min.");
  assert.equal(product.facts["Edad mínima"], "10 años");
  assert.equal(product.facts.Editorial, "Zacatrus");
  assert.equal(product.facts["Dependencia del idioma"], "Alta");
});

test("extractSourcePageProductFromMarkdown skips Zacatrus video thumbnails and keeps valid gallery images", () => {
  const markdown = `
# Rebirth - Juegos de Mesa - Zacatrus

![Image 1](https://zacatrus.es/static/version1780561502/frontend/zaca/z2025/es_ES/images/logo.svg)
![Image 5: Rebirth](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/r/e/rebirth_video.jpg)
![Image 6: Rebirth](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg)
![Image 7: Rebirth](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/r/e/rebirth.jpg)

# Rebirth

40,50€

Ficha técnica

Editorial

Devir
  `;

  const product = extractSourcePageProductFromMarkdown(markdown, "https://zacatrus.es/rebirth.html");

  assert.equal(product.imageUrl, "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg");
  assert.deepEqual(product.additionalImageUrls, [
    "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg",
    "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/r/e/rebirth.jpg"
  ]);
});

test("extractSourcePageProductFromMarkdown ignores Zacatrus related-product images", () => {
  const markdown = `
# Rebirth - Juegos de Mesa - Zacatrus

[Saltar al final de la galería de imágenes](https://zacatrus.es/rebirth.html#gallery-next-area)

![Image 5: Rebirth](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/r/e/rebirth_video.jpg)
![Image 6: Rebirth](https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg)

[Saltar al comienzo de la galería de imágenes](https://zacatrus.es/rebirth.html#gallery-prev-area)

# Rebirth

40,50€

## **Otros clientes también compraron:**

[![Image 12: Wingspan](https://zacatrus.es/media/catalog/product/cache/2765542505660baab28ecd555e27366e/w/i/wingspan.png)](https://zacatrus.es/wingspan.html)
  `;

  const product = extractSourcePageProductFromMarkdown(markdown, "https://zacatrus.es/rebirth.html");

  assert.equal(product.imageUrl, "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg");
  assert.deepEqual(product.additionalImageUrls, [
    "https://zacatrus.es/media/catalog/product/cache/207e23213cf636ccdef205098cf3c8a3/c/a/captura_de_pantalla_2026-04-15_101118_resultado.jpg"
  ]);
});
