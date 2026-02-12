import { create } from "zustand";

interface CreditStore {
  balance: number;
  isLoaded: boolean;
  isAnimating: boolean;

  setBalance: (balance: number) => void;
  deductCredit: () => void;
  setIsAnimating: (animating: boolean) => void;
}

export const useCreditStore = create<CreditStore>((set) => ({
  balance: 0,
  isLoaded: false,
  isAnimating: false,

  setBalance: (balance) => set({ balance, isLoaded: true }),

  deductCredit: () =>
    set((state) => ({
      balance: Math.max(0, state.balance - 1),
      isAnimating: true,
    })),

  setIsAnimating: (animating) => set({ isAnimating: animating }),
}));
