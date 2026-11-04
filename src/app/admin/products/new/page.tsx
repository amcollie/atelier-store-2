import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/admin/product-form";
import { listCategoryOptions } from "@/lib/admin/catalog";
import { EMPTY_PRODUCT } from "@/lib/admin/product-form-values";

import { createProductAction } from "../actions";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function NewProductPage() {
  return (
    <AdminPage path="/admin/products/new" title="New product">
      <NewProduct />
    </AdminPage>
  );
}

async function NewProduct() {
  const categories = await listCategoryOptions();
  return (
    <div className="stack max-w-3xl gap-8">
      <Link href="/admin/products" className="link self-start text-meta">
        All products
      </Link>
      <ProductForm mode="create" categories={categories} initial={EMPTY_PRODUCT} action={createProductAction} />
    </div>
  );
}
