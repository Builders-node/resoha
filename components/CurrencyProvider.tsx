'use client';
import { createContext, useContext, useMemo } from 'react';
import { makeMoney, type Currency, type Money } from '@/lib/currency';

const Ctx = createContext<Money>(makeMoney('USD', 1));

/** Валюту й курс читає root layout (кукі + денний курс) і передає сюди — як мову в LangProvider. */
export default function CurrencyProvider({ cur, rate, children }: { cur: Currency; rate: number; children: React.ReactNode }) {
  const value = useMemo(() => makeMoney(cur, rate), [cur, rate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMoney = () => useContext(Ctx);
