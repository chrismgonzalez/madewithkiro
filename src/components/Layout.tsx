import { ReactNode } from "react";
import Navigation from "@/components/Navigation";

interface LayoutProps {
  children: ReactNode;
  currentPath?: string;
}

export default function Layout({ children, currentPath = "/" }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Navigation */}
      <header>
        <Navigation currentPath={currentPath} />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MadeWithKiro. Built with Kiro.
            </div>
            <div className="flex gap-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Twitter
              </a>
              <a
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
