import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { ConsoleHead } from "@/components/console/shell";
import { ProductForm } from "@/components/retailer/product-form";
import { requireRetailer } from "@/lib/auth/access";
import { CATEGORIES } from "@/lib/format";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { retailer } = await requireRetailer();
  const { id } = await params;
  const product = id === "new" ? undefined : await db.query.products.findFirst({ where: and(eq(schema.products.id, id), eq(schema.products.retailerId, retailer.id)) });
  if (id !== "new" && !product) notFound();
  return (
    <>
      <p className="small mb-2"><Link href="/retailer/products">Menu and stock</Link></p>
      <ConsoleHead title={product ? `Edit ${product.name}` : "Add a product"} sub="Use the values printed on the product label. Descriptions are screened for health claims and youth-appealing language." />
      <ProductForm product={product} categories={CATEGORIES} />
    </>
  );
}
