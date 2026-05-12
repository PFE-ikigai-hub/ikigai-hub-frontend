import React from "react";


type GlassIconProps = {
  icon: React.ReactElement;
  color?: "blue" | "purple" | "red" | "indigo" | "orange" | "green";
  className?: string;
};

export function GlassIcon({ icon, color: _color = "blue", className = "" }: GlassIconProps) {
  return (
    <span
      className={`relative inline-flex w-8 h-8 [perspective:24em] [transform-style:preserve-3d] [-webkit-tap-highlight-color:transparent] group ${className}`}
      aria-hidden="true"
    >
      <span
        className="absolute top-0 left-0 w-full h-full rounded-[0.85em] block transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[100%_100%] rotate-[15deg] [will-change:transform] group-hover:[transform:rotate(25deg)_translate3d(-0.2em,-0.2em,0.2em)]"
        style={{
          background: "var(--ikg-mono-surface-gradient)",
          boxShadow: "0.5em -0.5em 0.75em hsla(223, 10%, 10%, 0.15)",
        }}
      />

      <span
        className="absolute top-0 left-0 w-full h-full rounded-[0.85em] bg-[hsla(0,0%,100%,0.15)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[80%_50%] flex backdrop-blur-[0.75em] [-webkit-backdrop-filter:blur(0.75em)] [-moz-backdrop-filter:blur(0.75em)] [will-change:transform] transform group-hover:[transform:translate3d(0,0,0.7em)]"
        style={{
          boxShadow: "0 0 0 0.1em hsla(0, 0%, 100%, 0.3) inset",
        }}
      >
        <span className="m-auto w-[1em] h-[1em] flex items-center justify-center text-white dark:text-black" aria-hidden="true">
          {icon}
        </span>
      </span>
    </span>
  );
}
