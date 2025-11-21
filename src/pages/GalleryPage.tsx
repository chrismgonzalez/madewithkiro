import ApplicationGallery from "@/components/ApplicationGallery";
import LandingPage from "@/pages/LandingPage";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { Sparkles } from "lucide-react";

export default function GalleryPage() {
  const { isAuthenticated } = useMockAuth();

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show gallery for authenticated users
  return (
    <div>
      <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Application Gallery
          </h1>
        </div>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
          Discover amazing applications built with Kiro by our community
        </p>
      </div>
      <ApplicationGallery />
    </div>
  );
}
