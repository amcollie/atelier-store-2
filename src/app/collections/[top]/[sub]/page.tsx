import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionSkeleton, CollectionView } from "@/components/collection-view";
import { getCollection, getCollectionPaths } from "@/lib/catalog";

type Props = PageProps<"/collections/[top]/[sub]">;

export async function generateStaticParams() {
  const paths = await getCollectionPaths();
  return paths.flatMap(({ top, sub }) => (sub ? [{ top, sub }] : []));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { top, sub } = await params;
  const collection = await getCollection(top, sub);
  if (!collection?.category.parent) return {};
  const { name, parent } = collection.category;
  return {
    title: `${parent.name} ${name}`,
    description: `Shop ${parent.name.toLowerCase()} ${name.toLowerCase()} at Atelier, newest first.`,
  };
}

// params are read inside Suspense so the route's shared App Shell stays URL-independent.
export default function SubCollectionPage({ params }: Props) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <SubCollection params={params} />
    </Suspense>
  );
}

async function SubCollection({ params }: Pick<Props, "params">) {
  const { top, sub } = await params;
  const collection = await getCollection(top, sub);
  if (!collection) notFound();

  return <CollectionView collection={collection} />;
}
