import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { Sparkles, Users, Rocket, Github, Linkedin } from "lucide-react";

export default function LandingPage() {
  const { toggleAuth } = useMockAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] px-3 sm:px-4">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-primary/10 rounded-full mb-3 sm:mb-4">
          <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Showcase Your{" "}
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Kiro Creations
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
          Join the community of builders sharing amazing applications created
          with Kiro. Discover what's possible and inspire others with your work.
        </p>

        <p className="text-sm sm:text-base text-muted-foreground px-2 pt-2">
          Ready to share your work with the world?
        </p>

        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <Github className="h-4 w-4" />
            <span>Open Source</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <Linkedin className="h-4 w-4" />
            <span>Professional Network</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AWS Community</span>
          </div>
        </div>

        <Button
          size="lg"
          onClick={toggleAuth}
          className="min-h-[52px] sm:min-h-[56px] text-base sm:text-lg px-8 sm:px-12 w-full sm:w-auto"
        >
          Sign In to Get Started
        </Button>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 pb-6 px-4 sm:px-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
                <Rocket className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">
                Share Your Apps
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Showcase your Kiro-built applications with the community. Add
                descriptions, tags, and links to your live apps and GitHub
                repos.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 pb-6 px-4 sm:px-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">
                Connect with Builders
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Discover talented developers and their projects. Link your
                LinkedIn, GitHub, and AWS Builder profiles to grow your network.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-6 pb-6 px-4 sm:px-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold">
                Get Inspired
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Browse a gallery of innovative applications built with Kiro.
                Filter by tags to find projects that match your interests.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
