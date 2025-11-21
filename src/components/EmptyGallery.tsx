import { Card, CardContent } from "@/components/ui/card";
import { PackageOpen } from "lucide-react";

export default function EmptyGallery() {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <PackageOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-3">
          No applications available
        </h3>
        <p className="text-muted-foreground max-w-md text-base">
          There are no applications to display at the moment. Check back later
          for new submissions from the community.
        </p>
      </CardContent>
    </Card>
  );
}
