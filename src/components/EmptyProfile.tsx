import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function EmptyProfile() {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-3">No applications yet</h3>
        <p className="text-muted-foreground max-w-md text-base">
          This user hasn't created any applications yet. Check back later to see
          their work.
        </p>
      </CardContent>
    </Card>
  );
}
