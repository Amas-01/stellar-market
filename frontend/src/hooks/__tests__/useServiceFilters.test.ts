import { renderHook } from "@testing-library/react";
import { useServiceFilters } from "@/hooks/useServiceFilters";

let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/services",
}));

describe("useServiceFilters page parsing (#1617)", () => {
  it.each(["0", "-5"])("clamps page=%s to page 1", (page) => {
    mockSearchParams = new URLSearchParams(`page=${page}`);
    const { result } = renderHook(() => useServiceFilters());
    expect(result.current.filters.page).toBe(1);
  });

  it("falls back to page 1 for a non-numeric page", () => {
    mockSearchParams = new URLSearchParams("page=abc");
    const { result } = renderHook(() => useServiceFilters());
    expect(result.current.filters.page).toBe(1);
  });

  it("keeps a valid positive page", () => {
    mockSearchParams = new URLSearchParams("page=7");
    const { result } = renderHook(() => useServiceFilters());
    expect(result.current.filters.page).toBe(7);
  });
});
