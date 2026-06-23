export const mobileOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MeepleTavern Public API",
    version: "1.0.0",
    description: "API publica de solo lectura para clientes de MeepleTavern."
  },
  servers: [
    {
      url: "/api/mobile/v1",
      description: "Public API v1"
    }
  ],
  tags: [
    { name: "Games", description: "Catalogo publico de juegos publicados." },
    { name: "Taxonomy", description: "Categorias y mecanicas para filtros." },
    { name: "Filters", description: "Opciones fijas de filtros soportadas por el listado." }
  ],
  paths: {
    "/games": {
      get: {
        tags: ["Games"],
        summary: "Lista paginada de juegos publicados",
        description: "Replica los filtros y el buscador funcionales de la pestaña web /juegos.",
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Busqueda de texto. Se aplica trim; un valor vacio equivale a no buscar.",
            schema: { type: "string" }
          },
          {
            name: "category",
            in: "query",
            description: "Slug de categoria. Se puede repetir para combinar valores con OR dentro del filtro.",
            schema: { type: "string" }
          },
          {
            name: "mechanic",
            in: "query",
            description: "Slug de mecanica. Se puede repetir para combinar valores con OR dentro del filtro.",
            schema: { type: "string" }
          },
          {
            name: "theme",
            in: "query",
            description: "Slug de tematica soportado por la logica movil aunque no se exponga en /filters.",
            schema: { type: "string" }
          },
          {
            name: "players",
            in: "query",
            description: "Numero de jugadores soportado por el juego. Valores actuales: 1, 2, 4, 6.",
            schema: { type: "string", enum: ["1", "2", "4", "6"] }
          },
          {
            name: "duration",
            in: "query",
            description: "Duracion maxima en minutos o long para juegos largos.",
            schema: { type: "string", enum: ["30", "45", "60", "120", "long"] }
          },
          {
            name: "weight",
            in: "query",
            description: "Dificultad editorial.",
            schema: { type: "string", enum: ["ligero", "medio", "duro"] }
          },
          {
            name: "age",
            in: "query",
            description: "Edad recomendada maxima admitida por el filtro.",
            schema: { type: "string", enum: ["7", "8", "10", "14"] }
          },
          {
            name: "sort",
            in: "query",
            description: "Orden del listado.",
            schema: { type: "string", enum: ["nombre", "valoracion", "fecha", "dificultad"], default: "nombre" }
          },
          {
            name: "page",
            in: "query",
            description: "Pagina 1-based.",
            schema: { type: "integer", minimum: 1, default: 1 }
          },
          {
            name: "limit",
            in: "query",
            description: "Elementos por pagina. Maximo 50.",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 }
          }
        ],
        responses: {
          "200": {
            description: "Listado paginado de juegos publicados.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GamesResponse" }
              }
            }
          }
        }
      }
    },
    "/games/{slug}": {
      get: {
        tags: ["Games"],
        summary: "Detalle de un juego publicado",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "Slug publico del juego.",
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Detalle publico del juego.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GameDetail" }
              }
            }
          },
          "404": {
            description: "El juego no existe o no esta publicado.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  notFound: {
                    value: { error: "Game not found" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/categories": {
      get: {
        tags: ["Taxonomy"],
        summary: "Categorias disponibles para filtros",
        responses: {
          "200": {
            description: "Categorias con conteo de juegos publicados.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaxonomyListResponse" }
              }
            }
          }
        }
      }
    },
    "/mechanics": {
      get: {
        tags: ["Taxonomy"],
        summary: "Mecanicas disponibles para filtros",
        responses: {
          "200": {
            description: "Mecanicas con conteo de juegos publicados.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaxonomyListResponse" }
              }
            }
          }
        }
      }
    },
    "/filters": {
      get: {
        tags: ["Filters"],
        summary: "Opciones fijas de filtros",
        description: "Valores estables para que los clientes no tengan que hardcodear jugadores, duracion, dificultad, edad ni orden.",
        responses: {
          "200": {
            description: "Opciones fijas soportadas por /games.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FiltersResponse" }
              }
            }
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        tags: ["Filters"],
        summary: "Contrato OpenAPI de la API movil",
        responses: {
          "200": {
            description: "Documento OpenAPI 3.1 en JSON."
          }
        }
      }
    },
    "/docs": {
      get: {
        tags: ["Filters"],
        summary: "Documentacion HTML de la API movil",
        responses: {
          "200": {
            description: "Vista HTML sencilla del contrato."
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TaxonomyItem: {
        type: "object",
        required: ["id", "slug", "name", "description"],
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] }
        }
      },
      TaxonomyFilterItem: {
        allOf: [
          { $ref: "#/components/schemas/TaxonomyItem" },
          {
            type: "object",
            required: ["gamesCount"],
            properties: {
              gamesCount: { type: "integer", minimum: 0 }
            }
          }
        ]
      },
      GameListItem: {
        type: "object",
        required: [
          "id",
          "slug",
          "title",
          "description",
          "imageUrl",
          "rating",
          "minPlayers",
          "maxPlayers",
          "playingTime",
          "categories",
          "mechanics"
        ],
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: ["string", "null"], format: "uri" },
          rating: { type: ["number", "null"], minimum: 0, maximum: 10 },
          minPlayers: { type: ["integer", "null"], minimum: 1 },
          maxPlayers: { type: ["integer", "null"], minimum: 1 },
          playingTime: { type: ["integer", "null"], minimum: 1 },
          categories: {
            type: "array",
            items: { $ref: "#/components/schemas/TaxonomyItem" }
          },
          mechanics: {
            type: "array",
            items: { $ref: "#/components/schemas/TaxonomyItem" }
          }
        }
      },
      GameDetail: {
        allOf: [
          { $ref: "#/components/schemas/GameListItem" },
          {
            type: "object",
            required: ["age", "year", "publisher", "offers"],
            properties: {
              age: { type: ["integer", "null"], minimum: 1 },
              year: { type: ["integer", "null"], minimum: 1800 },
              publisher: { type: ["string", "null"] },
              offers: {
                type: "array",
                items: { $ref: "#/components/schemas/GameOffer" }
              }
            }
          }
        ]
      },
      GameOffer: {
        type: "object",
        required: ["source", "price", "currency", "url"],
        properties: {
          source: { type: "string" },
          price: { type: ["number", "null"], minimum: 0 },
          currency: { type: "string", example: "EUR" },
          url: { type: "string", format: "uri" }
        }
      },
      GamesResponse: {
        type: "object",
        required: ["items", "pagination", "appliedFilters"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/GameListItem" }
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
          appliedFilters: {
            type: "object",
            additionalProperties: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } }
              ]
            }
          }
        }
      },
      Pagination: {
        type: "object",
        required: ["page", "limit", "total", "totalPages"],
        properties: {
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
          total: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 0 }
        }
      },
      TaxonomyListResponse: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/TaxonomyFilterItem" }
          }
        }
      },
      FilterOption: {
        type: "object",
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" }
        }
      },
      FiltersResponse: {
        type: "object",
        required: ["players", "duration", "weight", "age", "sort"],
        properties: {
          players: { type: "array", items: { $ref: "#/components/schemas/FilterOption" } },
          duration: { type: "array", items: { $ref: "#/components/schemas/FilterOption" } },
          weight: { type: "array", items: { $ref: "#/components/schemas/FilterOption" } },
          age: { type: "array", items: { $ref: "#/components/schemas/FilterOption" } },
          sort: { type: "array", items: { $ref: "#/components/schemas/FilterOption" } }
        }
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" }
        }
      }
    }
  }
} as const;

export type MobileOpenApiSpec = typeof mobileOpenApiSpec;
