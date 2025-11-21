import { useState, useMemo } from "react";
import { useApplications } from "@/hooks/useData";
import { filterApplicationsByTags } from "@/services/mockDataService";
import ApplicationCard from "./ApplicationCard";
import LoadingSpinner from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

export default function ApplicationGallery() {
  const { data: applications, isLoading, error } = useApplications();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Extract unique tags from visible applications
  const availableTags = useMemo(() => {
    if (!applications) return [];
    const tagSet = new Set<string>();
    applications.forEach((app) => {
      app.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [applications]);

  // Filter applications by selected tags
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    return filterApplicationsByTags(applications, selectedTags);
  }, [applications, selectedTags]);

  // Handle tag selection
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedTags([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Loading applications..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Error loading applications</p>
      </div>
    );
  }

  // Filter content component (reusable for both desktop and mobile)
  const FilterContent = () => (
    <div className="space-y-4">
      {/* Active Filters Display */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Filters</span>
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="min-h-[44px] text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tag Checkboxes */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Available Tags</span>
        <div className="space-y-2">
          {availableTags.map((tag) => (
            <div key={tag} className="flex items-center space-x-2 min-h-[44px]">
              <Checkbox
                id={`tag-${tag}`}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => handleTagToggle(tag)}
                aria-label={tag}
              />
              <Label
                htmlFor={`tag-${tag}`}
                className="text-sm font-normal cursor-pointer flex-1 py-3"
              >
                {tag}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Filter Button and Active Filters - Mobile */}
      <div className="lg:hidden mb-4 flex items-center gap-2">
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 min-h-[44px]">
              <Filter className="h-4 w-4" />
              Filters
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filter Applications</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Active filters preview on mobile */}
        {selectedTags.length > 0 && (
          <div className="flex-1 flex flex-wrap gap-1 overflow-x-auto">
            {selectedTags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {selectedTags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedTags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Sidebar - Desktop Only */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-4 space-y-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <FilterContent />
          </div>
        </aside>

        {/* Application Grid */}
        <div className="flex-1">
          {filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-lg mb-2">
                {selectedTags.length > 0
                  ? "No applications match your filters"
                  : "No applications available"}
              </p>
              {selectedTags.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="mt-4 min-h-[44px]"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredApplications.map((app) => (
                <ApplicationCard key={app.appId} application={app} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
