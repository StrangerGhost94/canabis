"use client";
import { setStock } from "@/app/actions/retailer";

export function StockSelect({ productId, locationId, value, label }: { productId: string; locationId: string; value: string; label: string }) {
  return (
    <form action={setStock}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locationId" value={locationId} />
      <select name="status" aria-label={label} defaultValue={value} className={`select stock-${value}`} style={{ minHeight: 34, padding: "4px 30px 4px 10px", fontSize: 14, width: "auto" }} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="IN_STOCK">In stock</option>
        <option value="LOW">Low</option>
        <option value="OUT">Out</option>
      </select>
    </form>
  );
}
