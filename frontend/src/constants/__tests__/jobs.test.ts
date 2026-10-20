/**
 * Covers #1618: XLM has no price feed, so its balance check must not pretend
 * 1 XLM is worth 1 USDC, while USDC's check stays exactly as it was.
 */

import { TOKEN_EXCHANGE_RATES, checkTokenBalance, requiredTokenAmount } from "../jobs";

describe("token exchange rates", () => {
  it("has no XLM rate rather than a 1:1 placeholder", () => {
    expect(TOKEN_EXCHANGE_RATES.XLM).toBeNull();
    expect(requiredTokenAmount(500, "XLM")).toBeNull();
  });

  it("reports an XLM balance check as unknown, whatever the balance", () => {
    expect(checkTokenBalance(0, 500, "XLM")).toBe("unknown");
    expect(checkTokenBalance(1_000_000, 500, "XLM")).toBe("unknown");
  });

  it("keeps USDC at its exact 1:1 rate", () => {
    expect(requiredTokenAmount(500, "USDC")).toBe(500);
  });

  it.each([
    [500, "sufficient"],
    [499.99, "insufficient"],
    [0, "insufficient"],
  ] as const)("checks a USDC balance of %s against a 500 budget as %s", (balance, expected) => {
    expect(checkTokenBalance(balance, 500, "USDC")).toBe(expected);
  });
});
