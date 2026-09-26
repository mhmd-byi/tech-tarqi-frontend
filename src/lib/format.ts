export function formatPrice(priceCents: number, currency: string): string {
  const amount = (priceCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return currency.toLowerCase() === "usd" ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

export function formatTerm(intervalMonths: number): string {
  if (intervalMonths === 12) return "1 year";
  if (intervalMonths === 24) return "2 years";
  return `${intervalMonths} months`;
}
