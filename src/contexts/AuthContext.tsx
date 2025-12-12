import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  signIn,
  confirmSignIn,
  SignInOutput,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { analytics } from "@/utils/analytics";

/**
 * Authenticated user information
 */
interface AuthUser {
  /** Unique user identifier from Cognito */
  userId: string;
  /** User's email address */
  email: string;
  /** User's first name (from Google) */
  givenName?: string;
  /** User's last name (from Google) */
  familyName?: string;
  /** URL to user's profile picture */
  picture?: string;
  /** Identity provider name (Google or email) */
  provider?: string;
}

/**
 * OTP sign-in response from Amplify
 * Contains challenge information for the OTP verification step
 */
interface OTPSignInResponse {
  /** Whether sign-in is complete (false when OTP verification needed) */
  isSignedIn: boolean;
  /** Next step in the authentication flow */
  nextStep: {
    signInStep: string;
    /** Public challenge parameters from Cognito */
    additionalInfo?: {
      email?: string;
      expiresIn?: string;
      error?: string;
      retryAfter?: string;
    };
  };
}

/**
 * OTP confirmation response from Amplify
 * Contains the result of OTP verification
 */
interface OTPConfirmResponse {
  /** Whether sign-in is complete */
  isSignedIn: boolean;
  /** Next step (should be DONE if successful) */
  nextStep: {
    signInStep: string;
  };
}

/**
 * Legacy OTP request response (for backward compatibility during migration)
 * @deprecated Use signInWithOTP instead
 */
interface OTPRequestResponse {
  message: string;
  expiresIn: number;
  session: string;
}

/**
 * Legacy OTP verification response (for backward compatibility during migration)
 * @deprecated Use confirmOTP instead
 */
interface OTPVerifyResponse {
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
  user: {
    userId: string;
    email: string;
    authMethods: string;
  };
  isNewUser: boolean;
  linkedAccount: boolean;
}

/**
 * Authentication context type definition
 */
interface AuthContextType {
  /** Current authenticated user or null if not authenticated */
  user: AuthUser | null;
  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether authentication status is being checked */
  isLoading: boolean;
  /** Whether the user has a pending account link */
  pendingLink?: boolean;
  /** The sub of the target user to link with */
  linkTargetSub?: string;
  /** Initiate Google OAuth sign-in flow */
  signInWithGoogle: () => Promise<void>;
  /** Initiate OTP authentication using Amplify CUSTOM_WITHOUT_SRP flow */
  signInWithOTP: (email: string) => Promise<OTPSignInResponse>;
  /** Confirm OTP code using Amplify confirmSignIn */
  confirmOTP: (code: string) => Promise<OTPConfirmResponse>;
  /** Sign out the current user globally */
  signOut: () => Promise<void>;
  /** Refresh the current session and obtain new tokens */
  refreshSession: () => Promise<void>;
  /** @deprecated Use signInWithOTP instead - kept for backward compatibility */
  requestOTP: (email: string) => Promise<OTPRequestResponse>;
  /** @deprecated Use confirmOTP instead - kept for backward compatibility */
  verifyOTP: (
    email: string,
    code: string,
    session: string
  ) => Promise<OTPVerifyResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * Provides authentication context to the application, managing user state,
 * OAuth flows, and session persistence. Automatically checks for existing
 * sessions on mount and listens for authentication events.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components that will have access to auth context
 *
 * @example
 * ```tsx
 * import { AuthProvider } from '@/contexts/AuthContext';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLink, setPendingLink] = useState<boolean | undefined>(
    undefined
  );
  const [linkTargetSub, setLinkTargetSub] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    // Check for existing session on mount
    checkUser();

    // Listen for auth events
    const hubListener = Hub.listen("auth", ({ payload: { event } }) => {
      switch (event) {
        case "signedIn":
          checkUser();
          break;
        case "signedOut":
          setUser(null);
          break;
        case "customOAuthState":
          // Handle custom state if needed
          break;
      }
    });

    return () => hubListener();
  }, []);

  const checkUser = async () => {
    try {
      // Use Amplify's getCurrentUser for all authentication methods
      // This works for both Google OAuth and OTP (CUSTOM_AUTH) users
      // since Cognito now handles token issuance for both
      await getCurrentUser();
      const attributes = await fetchUserAttributes();

      const authUser: AuthUser = parseUserAttributes(attributes);
      setUser(authUser);

      // Parse account linking flags from ID token (not user attributes)
      // Custom claims are only available in the JWT token, not in user attributes
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;

      if (idToken) {
        const pendingLinkValue = idToken.payload["custom:pending_link"] as
          | string
          | undefined;
        const linkGoogleUser = idToken.payload["custom:link_google_user"] as
          | string
          | undefined;

        const hasPendingLink = pendingLinkValue === "true";
        setPendingLink(hasPendingLink);
        setLinkTargetSub(linkGoogleUser || undefined);
      } else {
        setPendingLink(false);
        setLinkTargetSub(undefined);
      }

      // Identify user in PostHog
      analytics.identify(authUser.userId, {
        email: authUser.email,
        name: `${authUser.givenName || ""} ${authUser.familyName || ""}`.trim(),
        provider: authUser.provider,
      });
    } catch (error) {
      // No authenticated user
      setUser(null);
      setPendingLink(undefined);
      setLinkTargetSub(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse Cognito user attributes into AuthUser format
   *
   * Extracts user information from Cognito attributes and handles
   * provider-specific attribute mapping (Google vs email OTP).
   *
   * @param attributes - Record of Cognito user attributes
   * @returns Parsed AuthUser object
   */
  const parseUserAttributes = (
    attributes: Record<string, string | undefined>
  ): AuthUser => {
    const userId = attributes.sub || "";
    const email = attributes.email || "";
    const picture = attributes.picture;

    // Parse identities to get provider (for federated users like Google)
    const identitiesStr = attributes.identities;
    let provider: string | undefined;
    if (identitiesStr) {
      try {
        const identities = JSON.parse(identitiesStr);
        provider = identities[0]?.providerName;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // If no federated identity, check if this is an email OTP user
    // Email OTP users won't have identities attribute
    if (!provider && email) {
      provider = "email";
    }

    // Handle Google attributes (given_name, family_name)
    const givenName = attributes.given_name;
    const familyName = attributes.family_name;

    return {
      userId,
      email,
      givenName,
      familyName,
      picture,
      provider,
    };
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      // Re-throw to allow UI to handle
      throw error;
    }
  };

  /**
   * Initiate OTP authentication using Amplify's CUSTOM_WITHOUT_SRP flow
   *
   * This triggers the Cognito custom authentication flow:
   * 1. Register user (ensure they exist in Cognito) via /auth/register endpoint
   * 2. DefineAuthChallenge determines the flow
   * 3. CreateAuthChallenge generates and sends the OTP via email
   * 4. Returns challenge info for the UI to display
   *
   * @param email - User's email address
   * @returns Challenge response with public parameters
   * @throws Error if sign-in initiation fails
   *
   * Requirements: 8.1 - Use Amplify's signIn with CUSTOM_AUTH
   */
  const signInWithOTP = async (email: string): Promise<OTPSignInResponse> => {
    try {
      // Step 1: Register user (ensure they exist in Cognito)
      // This is required because CUSTOM_AUTH flow needs the user to exist
      // before authentication can be initiated
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const registerResponse = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json();
          throw new Error(
            errorData.error?.message || "Failed to register user"
          );
        }

        // Registration successful (or user already exists)
        // Continue with authentication
      } catch (registerError: any) {
        console.error("Registration error:", registerError);
        // If registration fails, throw a user-friendly error
        throw new Error(
          registerError.message || "Failed to prepare authentication"
        );
      }

      // Step 2: Initiate OTP authentication
      const result: SignInOutput = await signIn({
        username: email,
        options: {
          authFlowType: "CUSTOM_WITHOUT_SRP",
        },
      });

      // Extract public challenge parameters from the response
      // The additionalInfo field contains publicChallengeParameters from Cognito
      const nextStep = result.nextStep as {
        signInStep: string;
        additionalInfo?: Record<string, string>;
      };
      const additionalInfo = nextStep.additionalInfo;

      // Check for rate limiting error in public parameters
      if (additionalInfo?.error === "RATE_LIMITED") {
        const error = new Error(
          "Too many requests. Please wait before trying again."
        );
        (error as any).code = "RATE_LIMITED";
        (error as any).retryAfter = parseInt(
          additionalInfo.retryAfter || "60",
          10
        );
        throw error;
      }

      return {
        isSignedIn: result.isSignedIn,
        nextStep: {
          signInStep: result.nextStep.signInStep,
          additionalInfo: additionalInfo
            ? {
                email: additionalInfo.email,
                expiresIn: additionalInfo.expiresIn,
                error: additionalInfo.error,
                retryAfter: additionalInfo.retryAfter,
              }
            : undefined,
        },
      };
    } catch (error: any) {
      console.error("OTP sign-in error:", error);
      throw error;
    }
  };

  /**
   * Confirm OTP code using Amplify's confirmSignIn
   *
   * This completes the custom authentication flow:
   * 1. VerifyAuthChallenge validates the OTP code
   * 2. If valid, Cognito issues tokens
   * 3. User state is updated automatically via Hub listener
   *
   * @param code - 6-digit OTP code entered by user
   * @returns Confirmation response indicating success
   * @throws Error if verification fails (incorrect/expired code)
   *
   * Requirements: 8.2 - Use Amplify's confirmSignIn
   */
  const confirmOTP = async (code: string): Promise<OTPConfirmResponse> => {
    try {
      const result: SignInOutput = await confirmSignIn({
        challengeResponse: code,
      });

      // If sign-in is complete, refresh user state
      if (result.isSignedIn) {
        await checkUser();
      }

      return {
        isSignedIn: result.isSignedIn,
        nextStep: {
          signInStep: result.nextStep.signInStep,
        },
      };
    } catch (error: any) {
      console.error("OTP confirmation error:", error);

      // Map Cognito errors to user-friendly messages
      if (error.name === "NotAuthorizedException") {
        const customError = new Error(
          "Too many failed attempts. Please request a new code."
        );
        (customError as any).code = "MAX_ATTEMPTS_EXCEEDED";
        throw customError;
      }

      // Check if it's an expired or invalid code error
      if (
        error.message?.includes("expired") ||
        error.message?.includes("invalid")
      ) {
        const customError = new Error(error.message);
        (customError as any).code = error.message.includes("expired")
          ? "EXPIRED_OTP"
          : "INVALID_OTP";
        throw customError;
      }

      throw error;
    }
  };

  /**
   * @deprecated Use signInWithOTP instead
   * Legacy method for backward compatibility during migration
   * Wraps signInWithOTP to return the old response format
   */
  const requestOTP = async (email: string): Promise<OTPRequestResponse> => {
    const result = await signInWithOTP(email);
    return {
      message: "OTP sent successfully",
      expiresIn: parseInt(
        result.nextStep.additionalInfo?.expiresIn || "600",
        10
      ),
      session: "", // Session is managed by Amplify internally
    };
  };

  /**
   * @deprecated Use confirmOTP instead
   * Legacy method for backward compatibility during migration
   * Wraps confirmOTP to return the old response format
   */
  const verifyOTP = async (
    _email: string,
    code: string,
    _session: string
  ): Promise<OTPVerifyResponse> => {
    const result = await confirmOTP(code);

    if (!result.isSignedIn) {
      throw new Error("OTP verification failed");
    }

    // Get the current user info after successful authentication
    const attributes = await fetchUserAttributes();

    return {
      tokens: {
        idToken: "", // Tokens are managed by Amplify
        accessToken: "",
        refreshToken: "",
      },
      user: {
        userId: attributes.sub || "",
        email: attributes.email || "",
        authMethods: "email",
      },
      isNewUser: false, // This info is not available from Amplify directly
      linkedAccount: false,
    };
  };

  /**
   * Sign out the current user
   *
   * Uses Amplify's signOut which handles both Google OAuth and OTP users
   * since both now use Cognito-issued tokens.
   *
   * Requirements: 8.5 - Use Amplify's signOut
   */
  const signOut = async () => {
    try {
      // Reset PostHog user identity
      analytics.reset();

      // Sign out from Amplify (handles both Google OAuth and OTP users)
      await amplifySignOut();

      setUser(null);

      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Sign-out error:", error);
      throw error;
    }
  };

  /**
   * Refresh the current session and obtain new tokens
   *
   * Uses Amplify's fetchAuthSession with forceRefresh to get new tokens.
   * Works for both Google OAuth and OTP users.
   *
   * Requirements: 8.4 - Use Amplify's fetchAuthSession
   */
  const refreshSession = async () => {
    try {
      await fetchAuthSession({ forceRefresh: true });
    } catch (error) {
      console.error("Session refresh error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pendingLink,
        linkTargetSub,
        signInWithGoogle,
        signInWithOTP,
        confirmOTP,
        signOut,
        refreshSession,
        // Legacy methods for backward compatibility (deprecated)
        requestOTP,
        verifyOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 *
 * Provides access to the current user state, authentication status,
 * and authentication methods (sign in, sign out, refresh session).
 *
 * Uses Amplify Auth APIs for all authentication flows:
 * - Google OAuth: signInWithRedirect
 * - Email OTP: signIn with CUSTOM_WITHOUT_SRP + confirmSignIn
 * - Session management: getCurrentUser, fetchAuthSession
 *
 * @returns {AuthContextType} Authentication context containing:
 *   - user: Current authenticated user or null
 *   - isAuthenticated: Boolean indicating if user is authenticated
 *   - isLoading: Boolean indicating if auth check is in progress
 *   - signInWithGoogle: Function to initiate Google OAuth flow
 *   - signInWithOTP: Function to initiate OTP authentication (Requirements: 8.1)
 *   - confirmOTP: Function to verify OTP code (Requirements: 8.2)
 *   - signOut: Function to sign out the current user (Requirements: 8.5)
 *   - refreshSession: Function to refresh the current session (Requirements: 8.4)
 *
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signInWithGoogle, signInWithOTP, confirmOTP } = useAuth();
 *
 *   // Google OAuth
 *   if (!isAuthenticated) {
 *     return <button onClick={signInWithGoogle}>Sign In with Google</button>;
 *   }
 *
 *   // Email OTP flow
 *   const handleOTPSignIn = async (email: string) => {
 *     const result = await signInWithOTP(email);
 *     // Show OTP input UI
 *   };
 *
 *   const handleOTPVerify = async (code: string) => {
 *     const result = await confirmOTP(code);
 *     if (result.isSignedIn) {
 *       // Authentication complete
 *     }
 *   };
 *
 *   return <div>Welcome, {user?.givenName || user?.email}!</div>;
 * }
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider. " +
        "Wrap your component tree with <AuthProvider> to use authentication features."
    );
  }
  return context;
};
