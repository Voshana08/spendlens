export type InvestmentType =
  | "STOCK"
  | "CRYPTO"
  | "ETF"
  | "BOND"
  | "PROPERTY"
  | "OTHER";

// Prisma Decimal fields serialize as strings over the wire
export type Investment = {
  id: string;
  name: string;
  type: InvestmentType;
  buyPrice: string;
  quantity: string;
  currentValue: string;
  purchaseDate: string;
  notes: string | null;
  createdAt: string;
};

// ── Computed helpers ──────────────────────────────────────────────────────────

export function holdingCost(inv: Investment) {
  return Number(inv.buyPrice) * Number(inv.quantity);
}

export function holdingValue(inv: Investment) {
  return Number(inv.currentValue) * Number(inv.quantity);
}

export function holdingPnL(inv: Investment) {
  return holdingValue(inv) - holdingCost(inv);
}

export function holdingPnLPct(inv: Investment) {
  const cost = holdingCost(inv);
  if (cost === 0) return 0;
  return (holdingPnL(inv) / cost) * 100;
}
