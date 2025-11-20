import { Card, CardContent } from "@/components/ui/card";
import { PackageOpen } from "lucide-react";

export default function EmptyGallery() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No applications available
        </h3>
        <p className="text-muted-foreground max-w-md">
          There are no applications to display at the moment. Check back later
          for new submissions.
        </p>
      </CardContent>
    </Card>
  );
}
