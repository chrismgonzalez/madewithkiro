import { ExternalLink, Github, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Application } from "@/types";

interface ApplicationCardProps {
  application: Application;
}

export default function ApplicationCard({ application }: ApplicationCardProps) {
  const { name, description, appUrl, githubUrl, tags, userName, userId } =
    application;

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="group flex flex-col h-full hover:shadow-xl hover:border-primary/50 transition-all duration-300">
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors">
          {name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <Separator />

        {/* Creator Information */}
        <a
          href={`/profile/${userId}`}
          className="flex items-center gap-3 text-sm hover:text-primary transition-colors min-h-[44px] group/creator"
        >
          <Avatar className="h-8 w-8 border-2 border-muted group-hover/creator:border-primary transition-colors">
            <AvatarFallback className="text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Created by</span>
            <span className="font-medium">{userName}</span>
          </div>
        </a>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          <Button
            asChild
            size="sm"
            className="min-h-[44px] min-w-[44px] flex-1"
          >
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
                <Github className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
