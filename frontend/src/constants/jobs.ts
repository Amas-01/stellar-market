export const JOB_CATEGORIES = [
  "Frontend",
  "Backend",
  "Smart Contract",
  "Design",
  "Mobile",
  "Documentation",
  "DevOps",
] as const;

export const PAYMENT_TOKENS = ["XLM", "USDC"] as const;

export type PaymentToken = (typeof PAYMENT_TOKENS)[number];

/**
 * Price of one token in the job budget's unit (USDC).
 *
 * USDC is the budget's own unit, so its rate is exact. XLM has no price feed
 * wired in yet and is not pegged to USD, so its rate is `null` (unknown)
 * rather than a 1:1 placeholder, which would treat 1 XLM as worth 1 USDC and
 * make any balance check against it wrong.
 */
export const TOKEN_EXCHANGE_RATES: Record<PaymentToken, number | null> = {
  XLM: null,
  USDC: 1,
};

/** How many tokens a budget needs, or `null` while the token has no rate. */
export function requiredTokenAmount(budget: number, token: PaymentToken): number | null {
  const rate = TOKEN_EXCHANGE_RATES[token];
  return rate === null ? null : budget / rate;
}

export type BalanceCheck = "sufficient" | "insufficient" | "unknown";

/**
 * Whether a wallet balance covers a budget in the given token. Returns
 * `"unknown"` when the token has no rate, so callers neither claim the
 * balance is enough nor block a funding attempt on a made-up figure.
 */
export function checkTokenBalance(
  balance: number,
  budget: number,
  token: PaymentToken,
): BalanceCheck {
  const required = requiredTokenAmount(budget, token);
  if (required === null) return "unknown";
  return balance >= required ? "sufficient" : "insufficient";
}

export function formatTokenAmount(value: number, token: PaymentToken) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ${token}`;
}
