import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const MOCK_AUTH_STORAGE_KEY = "mockAuthState";
const MOCK_USER_ID_STORAGE_KEY = "mockCurrentUserId";

interface MockAuthContextType {
  isAuthenticated: boolean;
  currentUserId: string | null;
  toggleAuth: () => void;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(
  undefined
);

interface MockAuthProviderProps {
  children: ReactNode;
  initialAuth?: boolean;
  initialUserId?: string | null;
}

export function MockAuthProvider({
  children,
  initialAuth,
  initialUserId,
}: MockAuthProviderProps) {
  // Initialize state from localStorage or props, defaulting to false
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (initialAuth !== undefined) return initialAuth;
    const stored = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    return stored === "true";
  });

  // Initialize current user ID from localStorage or props
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (initialUserId !== undefined) return initialUserId;
    const stored = localStorage.getItem(MOCK_USER_ID_STORAGE_KEY);
    return stored || "user-001"; // Default to user-001 (Sarah Chen) when authenticated
  });

  // Persist authentication state to localStorage whenever it changes
  useEffect(() => {
    if (initialAuth === undefined) {
      localStorage.setItem(MOCK_AUTH_STORAGE_KEY, String(isAuthenticated));
    }
  }, [isAuthenticated, initialAuth]);

  // Persist current user ID to localStorage whenever it changes
  useEffect(() => {
    if (initialUserId === undefined && currentUserId) {
      localStorage.setItem(MOCK_USER_ID_STORAGE_KEY, currentUserId);
    }
  }, [currentUserId, initialUserId]);

  const toggleAuth = () => {
    setIsAuthenticated((prev) => {
      const newAuth = !prev;
      // When authenticating, set default user ID if not set
      if (newAuth && !currentUserId) {
        setCurrentUserId("user-001");
      }
      // When logging out, clear user ID
      if (!newAuth) {
        setCurrentUserId(null);
      }
      return newAuth;
    });
  };

  const value: MockAuthContextType = {
    isAuthenticated,
    currentUserId,
    toggleAuth,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextType {
  const context = useContext(MockAuthContext);

  if (context === undefined) {
    throw new Error("useMockAuth must be used within a MockAuthProvider");
  }

  return context;
}
