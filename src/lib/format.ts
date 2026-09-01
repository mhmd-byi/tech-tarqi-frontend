export function formatPrice(priceCents: number, currency: string): string {
  const amount = (priceCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return currency.toLowerCase() === "usd" ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

export function formatTerm(intervalMonths: number): string {
  if (intervalMonths === 12) return "Yearly";
  if (intervalMonths === 24) return "Every 2 years";
  return `Every ${intervalMonths} months`;
}
