import { useState } from "react";
import { LogOut, User, Moon, Sun, Monitor } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function UserAvatar() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const navigate = useNavigate();

  if (!user) return null;

  const initials =
    user.givenName && user.familyName
      ? `${user.givenName[0]}${user.familyName[0]}`.toUpperCase()
      : user.email[0].toUpperCase();

  const fullName =
    user.givenName && user.familyName
      ? `${user.givenName} ${user.familyName}`
      : user.email;

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate({ to: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const avatarContent = (
    <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
      {user.picture && <AvatarImage src={user.picture} alt={fullName} />}
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-sm">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (isDesktop) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="min-h-[44px] min-w-[44px] rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:ring-2 hover:ring-primary/50"
            aria-label="User menu"
          >
            {avatarContent}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to="/profile/$userId"
              params={{ userId: user.userId }}
              className="flex items-center cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Edit Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Theme
          </DropdownMenuLabel>
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex items-center cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{option.label}</span>
                {theme === option.value && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:ring-2 hover:ring-primary/50"
          aria-label="User menu"
        >
          {avatarContent}
        </button>
      </DrawerTrigger>
      <DrawerContent className="pb-4 sm:pb-6">
        <DrawerHeader className="text-center pb-4 sm:pb-6">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
              {user.picture && (
                <AvatarImage src={user.picture} alt={fullName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-base sm:text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col px-4">
              <DrawerTitle className="text-base sm:text-lg truncate max-w-[280px]">
                {fullName}
              </DrawerTitle>
              <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[280px]">
                {user.email}
              </p>
            </div>
          </div>
        </DrawerHeader>
        <div className="px-3 sm:px-4 space-y-3">
          <Link
            to="/profile/$userId"
            params={{ userId: user.userId }}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 sm:gap-3 min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium">Profile</span>
          </Link>

          <div className="space-y-2">
            <Separator />
            <p className="text-xs text-muted-foreground px-2">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center gap-1.5 min-h-[56px] px-2 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <Separator />
          </div>

          <button
            onClick={() => {
              handleSignOut();
              setOpen(false);
            }}
            className="flex items-center justify-center gap-2 sm:gap-3 min-h-[52px] sm:min-h-[56px] px-3 sm:px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors text-destructive w-full"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium">Sign Out</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
