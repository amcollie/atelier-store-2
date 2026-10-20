// Initial catalogue, loaded into Postgres by `pnpm db:seed` (src/db/seed.ts).
// Photography: Unsplash (https://unsplash.com/license).

import type { Product } from "../lib/catalog-types";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=2400&q=80&fm=jpg`;

// Zoomed 4:5 crop of the same photo around a focal point (x, y in 0–1), used as
// a "detail" shot in the product gallery.
const detail = (id: string, x: number, y: number, zoom: number) =>
  `https://images.unsplash.com/photo-${id}?w=2400&h=3000&fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&q=80&fm=jpg`;

/** Top categories in display order, each with its sub-categories. */
export const seedCategories = [
  {
    slug: "women",
    name: "Women",
    children: [
      { slug: "bags", name: "Bags" },
      { slug: "shoes", name: "Shoes" },
      { slug: "jewelry", name: "Jewelry" },
      { slug: "trousers", name: "Trousers" },
      { slug: "knitwear", name: "Knitwear" },
    ],
  },
  {
    slug: "men",
    name: "Men",
    children: [{ slug: "outerwear", name: "Outerwear" }],
  },
  {
    slug: "unisex",
    name: "Unisex",
    children: [{ slug: "accessories", name: "Accessories" }],
  },
];

export type SeedProduct = Omit<Product, "category" | "stock"> & {
  /** [top category slug, sub-category slug] */
  category: [string, string];
  quantity: number;
};

/** Newest first: the seed staggers created_at so this order is "new arrivals". */
export const seedProducts: SeedProduct[] = [
  {
    slug: "chevron-chain-shoulder-bag",
    name: "Chevron chain shoulder bag",
    category: ["women", "bags"],
    priceCents: 189000,
    badge: "New",
    styleCode: "AT-24B-0118",
    color: "Blush",
    quantity: 12,
    image: {
      src: unsplash("1566150905458-1bf1fc113f0d"),
      alt: "Blush leather shoulder bag with a chevron panel and chain strap",
    },
    gallery: [
      {
        src: detail("1566150905458-1bf1fc113f0d", 0.45, 0.45, 2.2),
        alt: "Close-up of the painted chevron panel on the bag's front flap",
      },
    ],
    description:
      "A structured flap bag in smooth calfskin, crossed by a hand-painted chevron in butter and ivory. The chain strap doubles for shoulder or crossbody wear.",
    details: [
      "Calfskin leather with painted edges",
      "Magnetic flap closure",
      "Interior zip pocket and card slot",
      "Sliding chain strap, 50cm drop",
      "W 24cm × H 16cm × D 7cm",
    ],
    care: "Store in the dust bag provided, away from direct light. Wipe with a soft, dry cloth.",
  },
  {
    slug: "floral-satin-pump",
    name: "Floral satin pump",
    category: ["women", "shoes"],
    priceCents: 92000,
    styleCode: "AT-24S-0342",
    color: "Cobalt floral",
    quantity: 12,
    sizes: [
      { label: "36", available: true },
      { label: "37", available: true },
      { label: "38", available: false },
      { label: "39", available: true },
      { label: "40", available: true },
    ],
    image: {
      src: unsplash("1543163521-1bf539c55dd2"),
      alt: "Pair of blue floral stiletto pumps on a white plinth",
    },
    gallery: [
      {
        src: detail("1543163521-1bf539c55dd2", 0.45, 0.62, 2.2),
        alt: "Close-up of the floral print and slim stiletto heel",
      },
    ],
    description:
      "A pointed pump in printed duchesse satin, set on a slender 100mm heel. Leather-lined and cushioned underfoot for an evening that runs late.",
    details: [
      "Printed silk-blend satin upper",
      "Leather lining and sole",
      "100mm stiletto heel",
      "Made in Italy",
    ],
    care: "Keep away from water. Store in the shoe bags provided with tissue in the toe.",
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round metal sunglasses",
    category: ["unisex", "accessories"],
    priceCents: 48000,
    styleCode: "AT-24A-0907",
    color: "Gold / green",
    quantity: 12,
    image: {
      src: unsplash("1511499767150-a48a237f0083"),
      alt: "Round gold-framed sunglasses on a white surface",
    },
    gallery: [
      {
        src: detail("1511499767150-a48a237f0083", 0.5, 0.5, 2),
        alt: "Close-up of the fine gold bridge and green lenses",
      },
    ],
    description:
      "A fine round frame in brushed gold-tone metal with bottle-green lenses. Light enough to forget, with adjustable nose pads for an even fit.",
    details: [
      "Gold-tone metal frame",
      "Green mineral glass lenses, 100% UV protection",
      "Adjustable nose pads",
      "Lens 49mm, bridge 21mm, temple 145mm",
      "Includes leather case and cloth",
    ],
    care: "Clean with the cloth provided. Store in the case when not worn.",
  },
  {
    slug: "technical-bomber-jacket",
    name: "Technical bomber jacket",
    category: ["men", "outerwear"],
    priceCents: 245000,
    badge: "New",
    styleCode: "AT-24M-0215",
    color: "Rust",
    quantity: 3,
    sizes: [
      { label: "S", available: false },
      { label: "M", available: true },
      { label: "L", available: true },
      { label: "XL", available: false },
    ],
    image: {
      src: unsplash("1591047139829-d91aecb6caea"),
      alt: "Rust bomber jacket held up on a hanger",
    },
    gallery: [
      {
        src: detail("1591047139829-d91aecb6caea", 0.5, 0.35, 2.2),
        alt: "Close-up of the ribbed collar and front zip",
      },
      {
        src: detail("1591047139829-d91aecb6caea", 0.5, 0.75, 2.2),
        alt: "Close-up of the ribbed hem and side pocket",
      },
    ],
    description:
      "A lightweight bomber in water-repellent technical twill, with a soft sheen and a relaxed shoulder. Ribbed trims at collar, cuffs and hem.",
    details: [
      "Water-repellent polyamide twill",
      "Two-way front zip",
      "Utility pocket on sleeve",
      "Relaxed fit; take your usual size",
    ],
    care: "Machine wash cold on a gentle cycle. Do not tumble dry.",
  },
  {
    slug: "pleated-satin-trousers",
    name: "Pleated satin trousers",
    category: ["women", "trousers"],
    priceCents: 118000,
    styleCode: "AT-24W-0561",
    color: "Blush",
    quantity: 12,
    sizes: [
      { label: "XS", available: true },
      { label: "S", available: true },
      { label: "M", available: true },
      { label: "L", available: true },
    ],
    image: {
      src: unsplash("1594633312681-425c7b97ccd1"),
      alt: "Blush satin trousers with gathered cuffs",
    },
    gallery: [
      {
        src: detail("1594633312681-425c7b97ccd1", 0.5, 0.3, 2),
        alt: "Close-up of the waistband and patch pocket",
      },
      {
        src: detail("1594633312681-425c7b97ccd1", 0.5, 0.8, 2),
        alt: "Close-up of the elasticated cuff at the ankle",
      },
    ],
    description:
      "Fluid satin trousers with soft front pleats, patch pockets and gathered ankle cuffs. Dress them up with heels or down with a knit.",
    details: [
      "Viscose satin",
      "Elasticated waist and cuffs",
      "Front patch pockets",
      "Relaxed, tapered leg",
    ],
    care: "Dry clean only.",
  },
  {
    slug: "pearl-collar-necklace",
    name: "Pearl collar necklace",
    category: ["women", "jewelry"],
    priceCents: 74000,
    styleCode: "AT-24J-0033",
    color: "Ivory / silver",
    quantity: 0,
    image: {
      src: unsplash("1515562141207-7a88fb7ce338"),
      alt: "Pearl necklace resting in an open jewellery box",
    },
    gallery: [
      {
        src: detail("1515562141207-7a88fb7ce338", 0.5, 0.6, 2.2),
        alt: "Close-up of the pavé rose clasp between pearls",
      },
    ],
    description:
      "A single strand of cultured freshwater pearls, finished with a pavé rose clasp in sterling silver. Sits just below the collarbone.",
    details: [
      "Cultured freshwater pearls, 7–8mm",
      "Sterling silver clasp with crystal pavé",
      "Length 42cm",
      "Presented in a lined gift box",
    ],
    care: "Put on last, take off first. Wipe with a soft cloth after wear and store flat.",
  },
  {
    slug: "open-knit-poncho",
    name: "Open-knit cotton poncho",
    category: ["women", "knitwear"],
    priceCents: 156000,
    styleCode: "AT-24W-0790",
    color: "Ecru",
    quantity: 12,
    sizes: [{ label: "One size", available: true }],
    image: {
      src: unsplash("1434389677669-e08b4cac3105"),
      alt: "Cream open-knit poncho with fringed hem on a hanger",
    },
    gallery: [
      {
        src: detail("1434389677669-e08b4cac3105", 0.5, 0.6, 2),
        alt: "Close-up of the open-knit texture and fringed edge",
      },
    ],
    description:
      "An airy open-knit poncho in organic cotton, finished with a hand-knotted fringe. Layer it over a slip dress or a crisp shirt.",
    details: ["Organic cotton", "Hand-knotted fringe", "V-neck", "One size"],
    care: "Hand wash cold and dry flat.",
  },
  {
    slug: "leather-strap-watch",
    name: "Leather strap watch, 36mm",
    category: ["unisex", "accessories"],
    priceCents: 132000,
    badge: "Limited",
    styleCode: "AT-24A-0412",
    color: "Rose gold / taupe",
    quantity: 2,
    image: {
      src: unsplash("1524592094714-0f0654e20314"),
      alt: "Minimal white-dial watch with a taupe leather strap held in a hand",
    },
    gallery: [
      {
        src: detail("1524592094714-0f0654e20314", 0.5, 0.45, 2.2),
        alt: "Close-up of the white dial and slim rose-gold hands",
      },
    ],
    description:
      "A slim 36mm case in rose-gold-tone steel with a clean white dial and baton indices, on a soft taupe leather strap.",
    details: [
      "36mm stainless steel case, rose-gold-tone finish",
      "Swiss quartz movement",
      "Sapphire crystal",
      "Water resistant to 30m",
      "Italian leather strap, pin buckle",
    ],
    care: "Avoid water and perfume on the strap. Have the battery replaced by an authorised service centre.",
  },
];
