import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/Layout";
import GalleryPage from "@/pages/GalleryPage";
import ProfilePage from "@/pages/ProfilePage";
import AddApplicationPage from "@/pages/AddApplicationPage";
import EditApplicationPage from "@/pages/EditApplicationPage";
import { AuthPage } from "@/pages/AuthPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import CreateProfilePage from "@/pages/CreateProfilePage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: false,
    },
  },
});

// Root route with providers and layout
const rootRoute = createRootRoute({
  component: () => {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Layout>
              <Outlet />
            </Layout>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  },
});

// Gallery route (public)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GalleryPage,
});

// Auth page route (public)
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: AuthPage,
});

// Auth callback route (public) - Keep as /auth/callback for Cognito
const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallbackPage,
});

// Create profile route (protected)
const createProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create-profile",
  component: () => (
    <ProtectedRoute>
      <CreateProfilePage />
    </ProtectedRoute>
  ),
});

// Profile view route (protected)
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: () => {
    const { userId } = profileRoute.useParams();
    return (
      <ProtectedRoute>
        <ProfilePage userId={userId} />
      </ProtectedRoute>
    );
  },
});

// Profile edit route (protected)
const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId/edit",
  component: () => {
    const { userId } = profileEditRoute.useParams();
    return (
      <ProtectedRoute>
        <ProfilePage userId={userId} />
      </ProtectedRoute>
    );
  },
});

// Add application route (protected)
const addAppRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-app",
  component: () => (
    <ProtectedRoute>
      <AddApplicationPage />
    </ProtectedRoute>
  ),
});

// Edit application route (protected)
const editAppRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit/$appId",
  component: () => (
    <ProtectedRoute>
      <EditApplicationPage />
    </ProtectedRoute>
  ),
});

// Privacy page route (public)
const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
});

// Terms page route (public)
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  authCallbackRoute,
  createProfileRoute,
  profileRoute,
  profileEditRoute,
  addAppRoute,
  editAppRoute,
  privacyRoute,
  termsRoute,
]);

// Create the router
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
