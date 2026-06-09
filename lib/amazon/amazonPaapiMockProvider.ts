import type { AmazonProduct } from "@/lib/amazon/amazonPaapiProvider";

export function getMockAmazonProduct(asin: string): AmazonProduct {
  return {
    asin,
    title: `Producto Amazon ${asin}`,
    detailPageUrl: `https://www.amazon.es/dp/${asin}`,
    brand: "Amazon",
    manufacturer: "Amazon",
    currency: "EUR",
    price: undefined,
    availability: "Mock de desarrollo",
    features: [
      "Mock de desarrollo para el flujo editorial",
      "Sustituir por la respuesta real de PA API cuando haya credenciales"
    ]
  };
}
