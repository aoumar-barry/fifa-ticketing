import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: null, // { cartId, expiresAt, matchId, seatId, seat }

  setCart: (cart) => {
    if (cart) {
      localStorage.setItem('fifa_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('fifa_cart');
    }
    set({ cart });
  },

  clearCart: () => {
    localStorage.removeItem('fifa_cart');
    set({ cart: null });
  },

  initializeCart: () => {
    try {
      const stored = localStorage.getItem('fifa_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If expired, clear it
        if (new Date(parsed.expiresAt) > new Date()) {
          set({ cart: parsed });
        } else {
          localStorage.removeItem('fifa_cart');
        }
      }
    } catch (e) {
      localStorage.removeItem('fifa_cart');
    }
  }
}));
