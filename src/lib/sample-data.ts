// Placeholder marketing content (navigation, hero, collections, editorial, services).
// Products, categories and stock live in Postgres; see src/lib/catalog.ts.
// Photography: Unsplash (https://unsplash.com/license).

import type { ImageAsset } from "./catalog-types";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=2400&q=80&fm=jpg`;
export type Collection = {
  slug: string;
  /** A real collection page: /collections/{top} or /collections/{top}/{sub}. */
  href: string;
  name: string;
  description: string;
  image: ImageAsset;
};

// No service pages exist yet, so services are shown without a link.
export type Service = {
  title: string;
  description: string;
  image: ImageAsset;
};

// Every link must lead to a page that exists: top categories are
// /collections/{top}, sub-categories /collections/{top}/{sub}.
export const navigation = [
  { label: "Women", href: "/collections/women" },
  { label: "Men", href: "/collections/men" },
  { label: "Unisex", href: "/collections/unisex" },
  { label: "Bags", href: "/collections/women/bags" },
  { label: "Shoes", href: "/collections/women/shoes" },
  { label: "Accessories", href: "/collections/unisex/accessories" },
];

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "The Quiet Season",
  description:
    "Tailoring cut close, knits worn loose, and colour kept to a whisper.",
  primary: { label: "Shop new arrivals", href: "/arrivals" },
  image: {
    src: unsplash("1539109136881-3be0616acf4b"),
    alt: "Model in a pale blue overcoat standing in a cathedral square",
  },
};

export const featuredCollections: Collection[] = [
  {
    slug: "women",
    href: "/collections/women",
    name: "Women",
    description: "Softened silhouettes and printed silks.",
    image: {
      src: unsplash("1581044777550-4cfa60707c03"),
      alt: "Model in a pink ruffled blouse holding sunglasses",
    },
  },
  {
    slug: "men",
    href: "/collections/men",
    name: "Men",
    description: "Sharp tailoring for long days in the city.",
    image: {
      src: unsplash("1507679799987-c73779587ccf"),
      alt: "Man fastening the button of a navy suit jacket",
    },
  },
];

export const editorial = {
  eyebrow: "The Story",
  title: "Made Slowly",
  body: "Every piece in the collection passes through a small workshop of makers, from the first pattern to the final hand-stitched edge. Fewer pieces, made to be kept.",
  images: [
    {
      src: unsplash("1485968579580-b6d095142e6e"),
      alt: "Woman in a checked wool coat walking down a city street",
    },
    {
      src: unsplash("1487222477894-8943e31ef7b2"),
      alt: "Man in a tan leather biker jacket and round sunglasses",
    },
  ] satisfies ImageAsset[],
};

export const categoryTiles: Collection[] = [
  {
    slug: "bags",
    href: "/collections/women/bags",
    name: "Bags",
    description: "Top handles, shoulder bags and totes.",
    image: {
      src: unsplash("1594223274512-ad4803739b7c"),
      alt: "Teal leather top handle bag beside reading glasses",
    },
  },
  {
    slug: "outerwear",
    href: "/collections/men/outerwear",
    name: "Outerwear",
    description: "Leather, wool and technical layers.",
    image: {
      src: unsplash("1520975954732-35dd22299614"),
      alt: "Man in a black leather jacket crouching against a brick wall",
    },
  },
  {
    slug: "jewelry",
    href: "/collections/women/jewelry",
    name: "Jewelry",
    description: "Chains, pendants and pearls.",
    image: {
      src: unsplash("1599643478518-a784e5dc4c8f"),
      alt: "Gold chain necklace with a blue gemstone pendant",
    },
  },
];

export const services: Service[] = [
  {
    title: "Book an appointment",
    description: "Shop in store with a personal advisor.",
    image: {
      src: unsplash("1441984904996-e0b6ba687e04"),
      alt: "Boutique interior with clothing rails under pendant lights",
    },
  },
  {
    title: "Personalization",
    description: "Initials and details, made to order.",
    image: {
      src: unsplash("1558769132-cb1aea458c5e"),
      alt: "Neutral knitwear hanging on a rail beside dried grasses",
    },
  },
  {
    title: "Find a store",
    description: "Visit us in person, wherever you are.",
    image: {
      src: unsplash("1441986300917-64674bd600d8"),
      alt: "Shop interior with shelves of folded clothing",
    },
  },
];
