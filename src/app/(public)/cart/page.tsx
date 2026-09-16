import type { Metadata } from "next";
import { CartPageClient } from "@/app/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-16">
      <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold text-foreground">
        Shopping cart
      </h1>
      <p className="mt-2 text-muted-foreground">
        Local cart (Redux) — aligned with learning-project cart pattern, without
        backend calls in Phase 3.
      </p>
      <div className="mt-10">
        <CartPageClient />
      </div>
    </div>
  );
}
