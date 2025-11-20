import ApplicationGallery from "@/components/ApplicationGallery";

export default function GalleryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Application Gallery</h1>
        <p className="text-muted-foreground mt-2">
          Discover amazing applications built with Kiro
        </p>
      </div>
      <ApplicationGallery />
    </div>
  );
}
