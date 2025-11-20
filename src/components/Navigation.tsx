import { useState } from "react";
import { Menu, LogIn, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPath?: string;
}

export default function Navigation({ currentPath = "/" }: NavigationProps) {
  const { isAuthenticated, toggleAuth } = useMockAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  // Define all possible nav links
  const allNavLinks = [
    { to: "/", label: "Gallery", requiresAuth: true },
    { to: "/profile/user-001", label: "Profile", requiresAuth: true },
    { to: "/add-app", label: "Add App", requiresAuth: true },
  ];

  // Filter nav links based on authentication status
  const navLinks = allNavLinks.filter(
    (link) => !link.requiresAuth || isAuthenticated
  );

  const NavLink = ({
    to,
    label,
    onClick,
  }: {
    to: string;
    label: string;
    onClick?: () => void;
  }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground active"
            : "text-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and App Name - Clickable to go home */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
              K
            </div>
            <span className="text-lg font-semibold">MadeWithKiro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} label={link.label} />
            ))}

            {/* Auth Toggle Button */}
            <Button
              variant="outline"
              onClick={toggleAuth}
              className="min-h-[44px] min-w-[44px] gap-2"
            >
              {isAuthenticated ? (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            {/* Auth Toggle Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAuth}
              className="min-h-[44px] min-w-[44px]"
              aria-label={isAuthenticated ? "Sign Out" : "Sign In"}
            >
              {isAuthenticated ? (
                <LogOut className="h-5 w-5" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
            </Button>

            {/* Hamburger Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px]"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      label={link.label}
                      onClick={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
