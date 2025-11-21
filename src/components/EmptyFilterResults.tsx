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
      <CardContent className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
        <div className="rounded-full bg-muted p-4 sm:p-6 mb-4 sm:mb-6">
          <Filter className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
          No applications match your filters
        </h3>
        <p className="text-muted-foreground max-w-md mb-6 sm:mb-8 text-sm sm:text-base px-4">
          Try adjusting your filters to see more results from the gallery.
        </p>
        <Button onClick={onClearFilters} className="gap-2 min-h-[44px]">
          <X className="h-4 w-4" />
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  );
}
