// Ce fichier gere une partie du frontend.
import * as React from "react";
import { cn } from "@/shared/utils/cn";


type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  borderGlow?: boolean;
  glowColors?: string[];
};

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, borderGlow: _borderGlow, glowColors: _glowColors, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-stone-200/80 bg-white/90 text-stone-950 shadow-lg shadow-stone-200/60 backdrop-blur-xl transition-all duration-300 dark:border-stone-800/60 dark:bg-[#111113]/90 dark:text-stone-50 dark:shadow-black/40",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-stone-900 dark:text-white", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-stone-500 dark:text-stone-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };