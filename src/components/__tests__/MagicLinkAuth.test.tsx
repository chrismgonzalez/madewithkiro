import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MagicLinkAuth } from "@/components/MagicLinkAuth";

// Mock the auth context
const mockSignInWithOTP = vi.fn();
const mockConfirmOTP = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signInWithOTP: mockSignInWithOTP,
    confirmOTP: mockConfirmOTP,
  }),
}));

describe("MagicLinkAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render email input form initially", () => {
    render(<MagicLinkAuth />);

    expect(screen.getByText("Sign in with email")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your email address")
    ).toBeInTheDocument();
    expect(screen.getByText("Send verification code")).toBeInTheDocument();
  });

  it("should show email sent state after successful OTP request", async () => {
    mockSignInWithOTP.mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE",
        additionalInfo: {
          email: "test@example.com",
          expiresIn: "600",
        },
      },
    });

    render(<MagicLinkAuth />);

    const emailInput = screen.getByPlaceholderText("Enter your email address");
    const submitButton = screen.getByText("Send verification code");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/We've sent a verification code to/)
    ).toBeInTheDocument();
    expect(screen.getByText("Three ways to sign in:")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter 6-digit code")
    ).toBeInTheDocument();
  });

  it("should format OTP input with spaces", async () => {
    mockSignInWithOTP.mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE",
        additionalInfo: {
          email: "test@example.com",
          expiresIn: "600",
        },
      },
    });

    render(<MagicLinkAuth />);

    // First send the email
    const emailInput = screen.getByPlaceholderText("Enter your email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByText("Send verification code"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Enter 6-digit code")
      ).toBeInTheDocument();
    });

    // Test OTP formatting
    const otpInput = screen.getByPlaceholderText("Enter 6-digit code");
    fireEvent.change(otpInput, { target: { value: "123456" } });

    expect(otpInput.value).toBe("1 2 3 4 5 6");
  });

  it("should handle rate limiting error", async () => {
    mockSignInWithOTP.mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE",
        additionalInfo: {
          error: "RATE_LIMITED",
          retryAfter: "60",
        },
      },
    });

    render(<MagicLinkAuth />);

    const emailInput = screen.getByPlaceholderText("Enter your email address");
    const submitButton = screen.getByText("Send verification code");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Too many requests. Please wait 60 seconds/)
      ).toBeInTheDocument();
    });
  });

  it("should verify OTP code successfully", async () => {
    // Mock successful OTP request
    mockSignInWithOTP.mockResolvedValue({
      isSignedIn: false,
      nextStep: {
        signInStep: "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE",
        additionalInfo: {
          email: "test@example.com",
          expiresIn: "600",
        },
      },
    });

    // Mock successful OTP verification
    mockConfirmOTP.mockResolvedValue({
      isSignedIn: true,
      nextStep: {
        signInStep: "DONE",
      },
    });

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: "" } as any;

    render(<MagicLinkAuth />);

    // Send email first
    const emailInput = screen.getByPlaceholderText("Enter your email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByText("Send verification code"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Enter 6-digit code")
      ).toBeInTheDocument();
    });

    // Enter and verify OTP
    const otpInput = screen.getByPlaceholderText("Enter 6-digit code");
    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Verify Code"));

    await waitFor(() => {
      expect(mockConfirmOTP).toHaveBeenCalledWith("123456");
    });
  });
});
