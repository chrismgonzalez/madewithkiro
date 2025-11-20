import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface EmptyFilterResultsProps {
  onClearFilters: () => void;
}

export default function EmptyFilterResults({
  onClearFilters,
}: EmptyFilterResultsProps) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Filter className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No applications match your filters
        </h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Try adjusting your filters to see more results.
        </p>
        <Button onClick={onClearFilters} variant="outline">
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
}
