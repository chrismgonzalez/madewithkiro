import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { router } from "./router";
import { queryClient } from "./config/queryClient";
import { PostHogProvider } from "./contexts";
import "./config/amplify"; // Initialize AWS Amplify

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </PostHogProvider>
  </StrictMode>
);
