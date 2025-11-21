import { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import { Heart } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Navigation />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/50 backdrop-blur mt-auto">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
            <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span>© {new Date().getFullYear()} MadeWithKiro.</span>
              <span className="flex items-center gap-1 sm:gap-2">
                Built with{" "}
                <Heart className="h-3 w-3 fill-primary text-primary" /> using
                Kiro
              </span>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <a
                href="https://github.com/chrismgonzalez/madewithkiro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
