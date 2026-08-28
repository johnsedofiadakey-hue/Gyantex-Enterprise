import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  priceMode?: 'fixed' | 'quote';
  minimumOrder?: string;
  category?: string;
  image: string;
  color: string;
  /** Chosen value per option group, e.g. { "Cloth Length": "12 Yards", "Size": "Large" }. */
  selections?: Record<string, string>;
  purchaseType: 'full' | 'half';
  quantity: number;
}

function sameSelections(a?: Record<string, string>, b?: Record<string, string>): boolean {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existingItemIndex = state.items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.color === item.color &&
            i.purchaseType === item.purchaseType &&
            sameSelections(i.selections, item.selections)
        );
        
        if (existingItemIndex > -1) {
          const newItems = [...state.items];
          newItems[existingItemIndex].quantity += item.quantity;
          return { items: newItems };
        }
        
        return { items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) => 
          item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      totalPrice: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
    }),
    {
      name: 'gyantex-cart-storage',
    }
  )
);

/**
 * The cart is read from localStorage, so it's only known once we're running
 * in the browser. Pages that need to gate rendering until then (to avoid a
 * server/client mismatch) should use this instead of a manual mounted flag.
 */
export function useCartHydrated() {
  return useSyncExternalStore(
    (callback) => useCartStore.persist.onFinishHydration(callback),
    () => useCartStore.persist.hasHydrated(),
    () => false
  );
}
