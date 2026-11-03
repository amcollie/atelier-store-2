import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectionSkeleton, CollectionView } from "@/components/collection-view";
import { getCollection, getCollectionPaths } from "@/lib/catalog";

type Props = PageProps<"/collections/[top]">;

export async function generateStaticParams() {
  const paths = await getCollectionPaths();
  return paths.filter((p) => !p.sub).map(({ top }) => ({ top }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollection((await params).top);
  if (!collection) return {};
  const { name } = collection.category;
  return { title: name, description: `Shop ${name} at Atelier, newest first.` };
}

// params are read inside Suspense so the route's shared App Shell stays URL-independent.
export default function TopCollectionPage({ params }: Props) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <TopCollection params={params} />
    </Suspense>
  );
}

async function TopCollection({ params }: Pick<Props, "params">) {
  const collection = await getCollection((await params).top);
  if (!collection) notFound();

  return <CollectionView collection={collection} />;
}
