// Catalogue shapes shared by the data layer, the seed, and (client) components.

export type ImageAsset = {
  src: string;
  alt: string;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ProductSize = { label: string; available: boolean };

export type CategoryRef = { slug: string; name: string };

export type Product = {
  slug: string;
  name: string;
  /** Always a sub-category; `parent` is its top category (Women, Men, Unisex). */
  category: CategoryRef & { parent: CategoryRef };
  priceCents: number;
  badge?: string;
  styleCode: string;
  color: string;
  stock: { status: StockStatus; quantity?: number };
  /** Omit for one-size items with nothing to choose. */
  sizes?: ProductSize[];
  /** Primary image, used on cards and first in the gallery. */
  image: ImageAsset;
  gallery: ImageAsset[];
  description: string;
  details: string[];
  care: string;
};
