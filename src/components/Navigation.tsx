import { LogIn, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMockAuth } from "@/contexts/MockAuthContext";
import UserAvatar from "@/components/UserAvatar";
import ModeToggle from "@/components/ModeToggle";

export default function Navigation() {
  const { isAuthenticated, toggleAuth } = useMockAuth();

  return (
    <nav className="w-full">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and App Name - Clickable to go home */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-base sm:text-lg shadow-lg group-hover:shadow-xl transition-shadow">
              K
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              MadeWithKiro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {/* Add App Button - Desktop */}
            {isAuthenticated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="icon"
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Link to="/add-app" aria-label="Add new app">
                        <Plus className="h-5 w-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add App</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Theme Toggle - Only for unauthenticated users */}
            {!isAuthenticated && <ModeToggle />}

            {/* Auth Toggle Button or User Avatar */}
            {isAuthenticated ? (
              <UserAvatar />
            ) : (
              <Button
                variant="outline"
                onClick={toggleAuth}
                className="min-h-[44px] min-w-[44px] gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-1 sm:gap-2">
            {/* Add App Button - Mobile */}
            {isAuthenticated && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="min-h-[44px] min-w-[44px] h-11 w-11"
              >
                <Link to="/add-app" aria-label="Add new app">
                  <Plus className="h-5 w-5" />
                </Link>
              </Button>
            )}

            {/* Theme Toggle - Mobile - Only for unauthenticated users */}
            {!isAuthenticated && <ModeToggle />}

            {/* Auth Toggle Button or User Avatar - Mobile */}
            {isAuthenticated ? (
              <UserAvatar />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAuth}
                className="min-h-[44px] min-w-[44px] h-11 w-11"
                aria-label="Sign In"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
