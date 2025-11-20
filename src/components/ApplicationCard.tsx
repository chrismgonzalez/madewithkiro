import { ExternalLink, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Application } from "@/types";

interface ApplicationCardProps {
  application: Application;
}

export default function ApplicationCard({ application }: ApplicationCardProps) {
  const { name, description, appUrl, githubUrl, tags, userName, userId } =
    application;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Creator Information */}
        <div className="text-sm text-muted-foreground">
          Created by{" "}
          <a
            href={`/profile/${userId}`}
            className="text-primary hover:underline font-medium inline-block py-2 min-h-[44px] leading-normal"
          >
            {userName}
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-auto pt-4">
          <Button asChild size="sm" className="min-h-[44px] min-w-[44px]">
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View application"
            >
              <ExternalLink className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">View App</span>
            </a>
          </Button>

          {githubUrl && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
            >
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View GitHub repository"
              >
                <Github className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
