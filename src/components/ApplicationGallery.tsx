import { useState, useMemo } from "react";
import { useApplications } from "@/hooks/useApplications";
import ApplicationCard from "./ApplicationCard";
import LoadingSpinner from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Helper function to filter applications by tags
function filterApplicationsByTags(applications: any[], selectedTags: string[]) {
  if (selectedTags.length === 0) return applications;
  return applications.filter((app) =>
    selectedTags.every((tag) => app.tags.includes(tag))
  );
}

const PAGE_SIZE = 50;

export default function ApplicationGallery() {
  const { applications, isLoading, error } = useApplications();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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
    return filterApplicationsByTags(applications || [], selectedTags);
  }, [applications, selectedTags]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredApplications.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedApplications = filteredApplications.slice(
    startIndex,
    endIndex
  );

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedTags]);

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

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Section */}
      <div className="space-y-3 sm:space-y-4">
        {/* Header with results count and clear button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FilterIcon className="h-4 w-4" />
            <span>
              {filteredApplications.length}{" "}
              {filteredApplications.length === 1 ? "app" : "apps"}
              {selectedTags.length > 0 && ` filtered`}
            </span>
          </div>
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-xs"
            >
              Clear all
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Scrollable badge filters */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`
                    cursor-pointer min-h-[44px] px-4 py-2 text-sm whitespace-nowrap
                    transition-all duration-200 select-none
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                  onClick={() => handleTagToggle(tag)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTagToggle(tag);
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Filter by ${tag}`}
                >
                  {tag}
                  {isSelected && <X className="ml-1.5 h-3 w-3" />}
                </Badge>
              );
            })}
          </div>
          {/* Fade effect for scroll indication */}
          {availableTags.length > 3 && (
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {/* Application Grid */}
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {paginatedApplications.map((app) => (
              <ApplicationCard key={app.appId} application={app} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-2 mt-8"
              aria-label="Pagination navigation"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground px-4">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
