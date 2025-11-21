import { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import { Separator } from "@/components/ui/separator";
import { Heart } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  currentPath?: string;
}

export default function Layout({ children, currentPath = "/" }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Navigation currentPath={currentPath} />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/50 backdrop-blur mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Separator className="mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              © {new Date().getFullYear()} MadeWithKiro. Built with{" "}
              <Heart className="h-3 w-3 fill-primary text-primary" /> using Kiro
            </div>
            <div className="flex gap-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Twitter
              </a>
              <a
                href="/about"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                About
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
