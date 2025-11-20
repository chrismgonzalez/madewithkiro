import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import Layout from "@/components/Layout";
import GalleryPage from "@/pages/GalleryPage";
import ProfilePage from "@/pages/ProfilePage";
import AddApplicationPage from "@/pages/AddApplicationPage";

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
    const location = useLocation();

    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <Layout currentPath={location.pathname}>
            <Outlet />
          </Layout>
        </MockAuthProvider>
      </QueryClientProvider>
    );
  },
});

// Gallery route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GalleryPage,
});

// Profile view route
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: () => {
    const { userId } = profileRoute.useParams();
    return <ProfilePage userId={userId} />;
  },
});

// Profile edit route
const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId/edit",
  component: () => {
    const { userId } = profileEditRoute.useParams();
    return <ProfilePage userId={userId} />;
  },
});

// Add application route
const addAppRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-app",
  component: AddApplicationPage,
});

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  profileRoute,
  profileEditRoute,
  addAppRoute,
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
