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
  /** Identity provider name (Google) */
  provider?: string;
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
  /** Initiate Google OAuth sign-in flow */
  signInWithGoogle: () => Promise<void>;
  /** Sign out the current user globally */
  signOut: () => Promise<void>;
  /** Refresh the current session and obtain new tokens */
  refreshSession: () => Promise<void>;
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
      await getCurrentUser();
      const attributes = await fetchUserAttributes();

      const authUser: AuthUser = parseUserAttributes(attributes);
      setUser(authUser);

      // Identify user in PostHog
      analytics.identify(authUser.userId, {
        email: authUser.email,
        name: `${authUser.givenName || ""} ${authUser.familyName || ""}`.trim(),
        provider: authUser.provider,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse Cognito user attributes into AuthUser format
   *
   * Extracts user information from Cognito attributes and handles
   * provider-specific attribute mapping (Google vs GitHub).
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

    // Parse identities to get provider
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

  const signOut = async () => {
    try {
      // Reset PostHog user identity
      analytics.reset();

      // Sign out locally - this clears tokens and session
      await amplifySignOut();
      setUser(null);

      // Simply redirect to home page
      // No need for Cognito hosted UI logout since we're using OAuth providers
      window.location.href = "/";
    } catch (error) {
      console.error("Sign-out error:", error);
      throw error;
    }
  };

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
        signInWithGoogle,
        signOut,
        refreshSession,
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
 * @returns {AuthContextType} Authentication context containing:
 *   - user: Current authenticated user or null
 *   - isAuthenticated: Boolean indicating if user is authenticated
 *   - isLoading: Boolean indicating if auth check is in progress
 *   - signInWithGoogle: Function to initiate Google OAuth flow
 *   - signOut: Function to sign out the current user
 *   - refreshSession: Function to refresh the current session
 *
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signInWithGoogle } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={signInWithGoogle}>Sign In</button>;
 *   }
 *
 *   return <div>Welcome, {user?.givenName}!</div>;
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
