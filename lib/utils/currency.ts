import { text } from "node:stream/consumers";

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function getCurrencySymbol(currency: string = "USD") {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });

  // Extract the currency symbol from the formatted string
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find((part) => part.type === "currency");

  return symbolPart?.value || "$"; // Default to "$" if no symbol is found
}



