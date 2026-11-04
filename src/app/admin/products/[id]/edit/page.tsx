import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/admin/product-form";
import { StockForm } from "@/components/admin/stock-form";
import { getProductForEdit, listCategoryOptions } from "@/lib/admin/catalog";
import { toFormValues } from "@/lib/admin/product-form-values";

import { updateProductAction } from "../../actions";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]/edit">) {
  return (
    <AdminPage path="/admin/products" title="Edit product">
      <EditProduct params={params} searchParams={searchParams} />
    </AdminPage>
  );
}

async function EditProduct({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/products/[id]/edit">["params"];
  searchParams: PageProps<"/admin/products/[id]/edit">["searchParams"];
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = /^\d{1,9}$/.test(rawId) ? Number(rawId) : NaN;
  if (!Number.isInteger(id)) notFound();

  const [product, categories] = await Promise.all([getProductForEdit(id), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <div className="stack max-w-3xl gap-8">
      <div className="cluster gap-x-6 gap-y-2 text-meta">
        <Link href="/admin/products" className="link">
          All products
        </Link>
        <Link href={`/products/${product.slug}`} className="link">
          View in store
        </Link>
      </div>

      <h2 className="heading-title normal-case">{product.name}</h2>

      {query.created === "1" ? (
        <p role="status" className="border-l-2 border-success py-1 pl-4 text-meta text-success">
          Product created. It&rsquo;s live in the store now.
        </p>
      ) : null}

      <section aria-labelledby="stock-title" className="stack gap-4 border border-line p-6">
        <h2 id="stock-title" className="eyebrow">
          Stock
        </h2>
        <StockForm productId={product.id} quantity={product.quantity} held={product.held} />
      </section>

      <ProductForm
        mode="edit"
        categories={categories}
        initial={toFormValues(product)}
        action={updateProductAction}
      />
    </div>
  );
}
