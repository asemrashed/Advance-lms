'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  hydrateCart,
  setCartLoaded,
  type CartLine,
} from '@/store/slices/cartSlice';

const CART_STORAGE_KEY = 'cart';

function normalizeStoredLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];

  const lines: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const courseId = String(row.courseId ?? row._id ?? '');
    if (!courseId) continue;

    const finalPrice = Number(row.finalPrice ?? row.price ?? 0);
    lines.push({
      courseId,
      title: String(row.title ?? ''),
      finalPrice,
      isPaid: typeof row.isPaid === 'boolean' ? row.isPaid : finalPrice > 0,
      quantity: Math.max(1, Number(row.quantity ?? 1)),
    });
  }
  return lines;
}

/** Hydrates Redux cart from localStorage and persists cart changes. */
export function CartPersistence() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const isLoaded = useAppSelector((s) => s.cart.isLoaded);

  useEffect(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem(CART_STORAGE_KEY)
          : null;
      if (saved) {
        dispatch(hydrateCart(normalizeStoredLines(JSON.parse(saved))));
      }
    } catch {
      // ignore corrupt cart payload
    }
    dispatch(setCartLoaded(true));
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isLoaded]);

  return null;
}
