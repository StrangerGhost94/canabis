"use client";
import { saveProduct } from "@/app/actions/retailer";
import { CATEGORY_LABEL } from "@/lib/format";
import { ActionForm, Field, Input, Submit } from "../form";

type P = { id: string; name: string; brand: string; category: string; size: string; potencyUnit: string; thcMin: number | null; thcMax: number | null; cbdMin: number | null; cbdMax: number | null; priceCents: number; description: string | null; equivalentGrams: number; imageKey: string | null };

export function ProductForm({ product, categories }: { product?: P; categories: string[] }) {
  const v = (x: number | null | undefined) => (x == null ? "" : String(x));
  return (
    <ActionForm action={saveProduct}>
      {(s) => (
        <>
          {product && <input type="hidden" name="id" value={product.id} />}
          <div className="form-row">
            <Field name="name" label="Product name" state={s}><Input name="name" defaultValue={product?.name} state={s} /></Field>
            <Field name="brand" label="Brand" state={s}><Input name="brand" defaultValue={product?.brand} state={s} /></Field>
          </div>
          <div className="form-row">
            <Field name="category" label="Format" state={s}>
              <select id="category" name="category" className="select" defaultValue={s?.values?.category ?? product?.category ?? "FLOWER"}>
                {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field name="size" label="Package size" hint="As on the label, e.g. 3.5 g or 5 × 2 mg" state={s}><Input name="size" defaultValue={product?.size} state={s} /></Field>
          </div>
          <fieldset className="stack" style={{ ["--gap" as string]: "12px" }}>
            <legend>Potency, from the label</legend>
            <Field name="potencyUnit" label="Unit" state={s}>
              <select id="potencyUnit" name="potencyUnit" className="select" defaultValue={s?.values?.potencyUnit ?? product?.potencyUnit ?? "%"} style={{ maxWidth: 260 }}>
                <option value="%">% by weight (dried, pre-rolls, extracts)</option>
                <option value="mg">mg per package (edibles, beverages, topicals)</option>
              </select>
            </Field>
            <div className="form-row">
              <Field name="thcMin" label="THC min" state={s}><Input name="thcMin" inputMode="decimal" defaultValue={v(product?.thcMin)} state={s} /></Field>
              <Field name="thcMax" label="THC max" state={s}><Input name="thcMax" inputMode="decimal" defaultValue={v(product?.thcMax)} state={s} /></Field>
              <Field name="cbdMin" label="CBD min" state={s}><Input name="cbdMin" inputMode="decimal" defaultValue={v(product?.cbdMin)} state={s} /></Field>
              <Field name="cbdMax" label="CBD max" state={s}><Input name="cbdMax" inputMode="decimal" defaultValue={v(product?.cbdMax)} state={s} /></Field>
            </div>
          </fieldset>
          <div className="form-row">
            <Field name="price" label="Price (CAD)" hint="Shown only where provincial rules allow prices." state={s}>
              <Input name="price" inputMode="decimal" defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""} state={s} />
            </Field>
            <Field name="equivalentGrams" label="Dried-cannabis equivalent (g)" hint="As printed on the label. Used for the 30 g limit." state={s}>
              <Input name="equivalentGrams" inputMode="decimal" defaultValue={product ? String(product.equivalentGrams) : ""} state={s} />
            </Field>
          </div>
          <Field name="image" label="Pack shot (optional)" hint="JPEG or PNG on a plain background, up to 4 MB. Without one, Cairn draws the package." state={s}>
            <input id="image" name="image" type="file" accept="image/jpeg,image/png" className="input" />
          </Field>
          <Field name="description" label="Description" hint="Factual details only: format, packaging, how it's made. No health claims, effects or lifestyle language." state={s}>
            <textarea id="description" name="description" className="textarea" defaultValue={s?.values?.description ?? product?.description ?? ""} maxLength={600} aria-invalid={s?.fields?.description ? true : undefined} />
          </Field>
          <div className="row"><Submit pending="Saving…">{product ? "Save product" : "Add product"}</Submit><a href="/retailer/products" className="btn ghost">Cancel</a></div>
        </>
      )}
    </ActionForm>
  );
}
