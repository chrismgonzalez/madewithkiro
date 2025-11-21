import ApplicationGallery from "@/components/ApplicationGallery";
import { Sparkles } from "lucide-react";

export default function GalleryPage() {
  return (
    <div>
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Application Gallery
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover amazing applications built with Kiro by our community
        </p>
      </div>
      <ApplicationGallery />
    </div>
  );
}
