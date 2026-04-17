import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-stone-400/50",
  {
    variants: {
      variant: {
        default: "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98] dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] dark:bg-red-600 dark:hover:bg-red-700",
        outline: "border border-stone-200 bg-white/80 backdrop-blur-sm text-stone-900 hover:bg-stone-50 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-100 dark:hover:bg-stone-800",
        secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200 active:scale-[0.98] dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700",
        ghost: "hover:bg-stone-100/80 hover:text-stone-900 active:scale-[0.98] dark:hover:bg-stone-800/50 dark:hover:text-stone-100",
        link: "text-stone-900 underline-offset-4 hover:underline dark:text-stone-100",
        glass: "bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-900 hover:bg-white active:scale-[0.98] dark:bg-[#111113]/80 dark:border-stone-800/60 dark:text-white dark:hover:bg-[#111113]",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
