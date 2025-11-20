import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "../ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary - Acceptance Tests", () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("GIVEN a React component throws an error WHEN the error occurs THEN I should see a fallback UI with error message", () => {
    // GIVEN a React component throws an error
    // WHEN the error occurs
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // THEN I should see a fallback UI with error message
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it("GIVEN an error boundary is displayed WHEN I click Try Again THEN the error boundary should reset", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    // Component that can toggle error state
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    // GIVEN an error boundary is displayed
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Verify error is displayed
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // WHEN I click "Try Again"
    const tryAgainButton = screen.getByRole("button", { name: /try again/i });

    // Change the error state before clicking
    shouldThrow = false;
    await user.click(tryAgainButton);

    // THEN the error boundary should reset
    // After clicking, the boundary resets and re-renders children
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
