"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionState, UserFacingError } from "@/lib/actions/result";
import { requireUser } from "@/lib/auth/session";
import { addToCart, setFulfilment, setQuantity, type AddResult } from "@/lib/cart";
import { placeOrder, transitionOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

export async function addToCartAction(productId: string, quantity = 1): Promise<AddResult> {
  try {
    await rateLimit(`cart:${await clientIpHash()}`, 120, 60);
    const res = await addToCart(z.string().min(1).max(64).parse(productId), z.number().int().min(1).max(10).parse(quantity));
    revalidatePath("/", "layout");
    return res;
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "That couldn't be added. Try again." };
  }
}

export async function updateCartLine(form: FormData) {
  const d = z.object({ productId: z.string(), quantity: z.coerce.number().int().min(0).max(10) }).parse(Object.fromEntries(form));
  await setQuantity(d.productId, d.quantity).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function chooseFulfilment(form: FormData) {
  const f = form.get("fulfilment") === "PICKUP" ? "PICKUP" : "DELIVERY";
  await setFulfilment(f);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

const Phone = z.string().trim().regex(/^[0-9 ()+.-]{10,20}$/, "Enter a phone number the store can reach you on.");

export async function checkout(_: ActionState, form: FormData): Promise<ActionState> {
  let dest: string | null = null;
  try {
    const user = await requireUser("/checkout");
    await rateLimit(`order:${user.id}`, 10, 3600);
    const base = z.object({
      fulfilment: z.enum(["PICKUP", "DELIVERY"], { errorMap: () => ({ message: "Choose pickup or delivery." }) }),
      contactName: z.string().trim().min(2, "Enter the name on your ID.").max(80),
      contactPhone: Phone,
      notes: z.string().trim().max(300).optional(),
      ageId: z.literal("yes", { errorMap: () => ({ message: "Confirm you'll show government ID." }) }),
    }).parse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
    const address = base.fulfilment === "DELIVERY" ? z.object({
      street: z.string().trim().min(3, "Enter the street address.").max(120),
      unit: z.string().trim().max(20).optional(),
      city: z.string().trim().min(2, "Enter the city.").max(60),
      postalCode: z.string().trim().toUpperCase().regex(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, "Enter a postal code like M4M 2Y6."),
    }).parse({ street: form.get("street"), unit: form.get("unit") || undefined, city: form.get("city"), postalCode: form.get("postalCode") }) : undefined;
    const orders = await placeOrder(user, { ...base, address });
    dest = orders.length === 1 ? `/orders/${orders[0].id}?placed=1` : `/orders?placed=${orders.length}`;
  } catch (e) {
    return fail(e, form);
  }
  redirect(dest);
}

export async function cancelOrder(form: FormData) {
  const user = await requireUser("/orders");
  const id = String(form.get("orderId"));
  await transitionOrder(id, "CANCELLED", { id: user.id, as: "customer" });
  revalidatePath(`/orders/${id}`);
}
