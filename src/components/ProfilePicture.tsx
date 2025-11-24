import { useState } from "react";

interface ProfilePictureProps {
  pictureUrl?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-24 h-24 text-2xl",
} as const;

const FALLBACK_GRADIENT = "bg-gradient-to-br from-primary to-primary/70";
const FALLBACK_TEXT_COLOR = "text-primary-foreground";

export const ProfilePicture = ({
  pictureUrl,
  name,
  size = "md",
}: ProfilePictureProps) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = SIZE_CLASSES[size];
  const initial = name.charAt(0).toUpperCase();

  // If no picture URL or image failed to load, show fallback
  if (!pictureUrl || imageError) {
    return (
      <div
        className={`${sizeClasses} rounded-full ${FALLBACK_GRADIENT} ${FALLBACK_TEXT_COLOR} flex items-center justify-center font-semibold`}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={pictureUrl}
      alt={`${name}'s profile picture`}
      className={`${sizeClasses} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  );
};
