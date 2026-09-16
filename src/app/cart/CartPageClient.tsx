"use client";

import Link from "next/link";
import {
  clearCart,
  removeFromCart,
  setLineQuantity,
  useAppDispatch,
  useAppSelector
} from "@/store";
import { useCheckout } from "@/hooks/useCheckout";

export function CartPageClient() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const { handleCheckout, isPending, toastMessage, toastType } = useCheckout();
  const subtotal = items.reduce(
    (sum, line) => sum + line.finalPrice * line.quantity,
    0,
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
        <p className="mt-2 text-muted-foreground">
          Add a course from the catalog — cart state is local to this browser
          session (mock checkout).
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-on-primary"
        >
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
      <ul className="space-y-4">
        {items.map((line) => (
          <li
            key={line.courseId}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link
                href={`/course/${line.courseId}`}
                className="font-headline text-lg font-bold text-primary hover:underline"
              >
                {line.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {line.isPaid ? `৳${line.finalPrice} each` : "Free"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                Qty
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    dispatch(
                      setLineQuantity({
                        courseId: line.courseId,
                        quantity: Number.isFinite(n) ? Math.max(1, n) : 1,
                      }),
                    );
                  }}
                  className="w-16 rounded-lg border border-border px-2 py-1"
                />
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-destructive hover:underline"
                onClick={() => dispatch(removeFromCart(line.courseId))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        onClick={() => dispatch(clearCart())}
      >
        Clear cart
      </button>
      </div>
      <aside className="rounded-2xl border border-border bg-surface-container-low p-6">
        <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
        <p className="mt-2 text-3xl font-black text-foreground">৳{Math.floor(subtotal)}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Secure checkout is powered by SSLCommerz.
        </p>
        <button
          type="button"
          onClick={() => handleCheckout()}
          disabled={isPending}
          className="mt-6 w-full rounded-lg cursor-pointer bg-linear-to-br from-primary to-primary-container py-3.5 text-center font-bold text-on-primary shadow-lg shadow-blue-900/20 transition-transform active:scale-[0.99]"
        >
          {isPending ? "Processing..." : "Checkout"}
        </button>
      </aside>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in-up">
          <div className={`${
            toastType === "error" 
              ? 'bg-red-500' 
              : 'bg-green-500'
          } text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
            {toastType === "error" ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8V12M12 16H12.01" strokeLinecap="round" />
                </svg>
                <span className="font-medium">{toastMessage}</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-medium">{toastMessage}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
