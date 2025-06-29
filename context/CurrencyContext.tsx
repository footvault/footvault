"use client"
import React, { createContext, useContext } from "react";

interface CurrencyContextProps {
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextProps>({ currency: "USD" });

export function CurrencyProvider({
  children,
  currency,
}: {
  children: React.ReactNode;
  currency: string;
}) {
  return (
    <CurrencyContext.Provider value={{ currency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
