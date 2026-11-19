"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Donation basket: several campaigns paid in one Pi payment. Kept in this browser only.
export type CartItem = { campaignId: string; title: string; amount: number };

type Ctx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setAmount: (campaignId: string, amount: number) => void;
  remove: (campaignId: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "sanad_cart";
const MAX = 10;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the basket after hydration
      if (Array.isArray(saved)) setItems(saved.slice(0, MAX));
    } catch {}
  }, []);

  const save = (next: CartItem[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    return next;
  };

  const add = useCallback((item: CartItem) => {
    setItems((cur) => {
      const exists = cur.find((i) => i.campaignId === item.campaignId);
      const next = exists
        ? cur.map((i) => (i.campaignId === item.campaignId ? { ...i, amount: Math.round((i.amount + item.amount) * 100) / 100 } : i))
        : [...cur, item].slice(0, MAX);
      return save(next);
    });
  }, []);
  const setAmount = useCallback((campaignId: string, amount: number) => setItems((cur) => save(cur.map((i) => (i.campaignId === campaignId ? { ...i, amount } : i)))), []);
  const remove = useCallback((campaignId: string) => setItems((cur) => save(cur.filter((i) => i.campaignId !== campaignId))), []);
  const clear = useCallback(() => setItems(save([])), []);

  return <CartContext.Provider value={{ items, add, setAmount, remove, clear, open, setOpen }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}
