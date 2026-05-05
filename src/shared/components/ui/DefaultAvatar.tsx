// Ce fichier gere une partie du frontend.
import { User } from "lucide-react";


interface DefaultAvatarProps {
  src?: string;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  iconClassName?: string;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-14 h-14",
  xl: "w-16 h-16",
  "2xl": "w-24 h-24",
};

const textSizes = {
  xs: "text-[10px] leading-none",
  sm: "text-xs leading-none",
  md: "text-lg leading-none",
  lg: "text-xl leading-none",
  xl: "text-2xl leading-none",
  "2xl": "text-4xl leading-none",
};

const iconSizes = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-7 h-7",
  xl: "w-8 h-8",
  "2xl": "w-12 h-12",
};

export function DefaultAvatar({ 
  src,
  name,
  alt,
  size = "md",
  className = "", 
  iconClassName = "" 
}: DefaultAvatarProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;
  const textClass = textSizes[size] || textSizes.md;
  
  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || "Avatar"}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
    );
  }
  
  let initials = "?";
  if (name || alt) {
    const textStr = name || alt || "";
    const parts = textStr.split(" ").filter(Boolean);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  }

  const useInitials = !!(name || alt);

  return (
    <div 
      className={`rounded-full flex items-center justify-center bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 ${sizeClass} ${className}`}
      title={name || alt}
    >
      {useInitials ? (
        <span className={`font-semibold text-stone-500 dark:text-stone-300 tracking-wide ${textClass}`}>{initials}</span>
      ) : (
        <User className={`text-stone-400 dark:text-stone-500 ${iconSize} ${iconClassName}`} />
      )}
    </div>
  );
}