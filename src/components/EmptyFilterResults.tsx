import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface EmptyFilterResultsProps {
  onClearFilters: () => void;
}

export default function EmptyFilterResults({
  onClearFilters,
}: EmptyFilterResultsProps) {
  return (
    <Card className="w-full border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <Filter className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-3">
          No applications match your filters
        </h3>
        <p className="text-muted-foreground max-w-md mb-8 text-base">
          Try adjusting your filters to see more results from the gallery.
        </p>
        <Button onClick={onClearFilters} size="lg" className="gap-2">
          <X className="h-4 w-4" />
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  );
}
