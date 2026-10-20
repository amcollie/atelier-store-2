import Image from "next/image";

import type { ImageAsset } from "@/lib/catalog-types";

// Phones/tablets: swipeable full-bleed row with the next image peeking in.
// Desktop: images stacked in one tall column beside the sticky product info.
export function ProductGallery({ images }: { images: ImageAsset[] }) {
  const single = images.length === 1;

  return (
    <ul
      aria-label="Product images"
      className="scroll-row gap-px bg-line lg:flex-col lg:overflow-visible"
    >
      {images.map((img, i) => (
        <li
          key={img.src}
          className={`${single ? "w-full" : "w-[88vw] sm:w-[72vw] md:w-[58vw]"} lg:w-full`}
        >
          <div className="media-frame aspect-[4/5]">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              preload={i === 0}
              sizes="(width >= 64rem) 58vw, (width >= 48rem) 58vw, 88vw"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
