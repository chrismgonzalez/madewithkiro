import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function EmptyProfile() {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
        <div className="rounded-full bg-muted p-4 sm:p-6 mb-4 sm:mb-6">
          <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
          No applications yet
        </h3>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base px-4">
          This user hasn't created any applications yet. Check back later to see
          their work.
        </p>
      </CardContent>
    </Card>
  );
}
