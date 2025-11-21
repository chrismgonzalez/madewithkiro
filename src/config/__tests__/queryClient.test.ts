import { describe, it, expect } from "vitest";
import { queryClient } from "../queryClient";

describe("QueryClient Configuration", () => {
  it("should be configured with correct staleTime", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
  });

  it("should be configured with correct gcTime (cache time)", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
  });

  it("should be configured with correct retry count", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(2);
  });

  it("should be configured to not refetch on window focus", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("should be configured with mutation retry", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.mutations?.retry).toBe(1);
  });
});
