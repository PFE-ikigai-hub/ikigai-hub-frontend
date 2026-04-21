import React from "react";

interface PreloaderIndicatorProps {
  className?: string;
  size?: number;
}

export const PreloaderIndicator: React.FC<PreloaderIndicatorProps> = ({ className = "", size = 1 }) => {
  const px = Math.max(16, Math.round(28 * size));

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="rounded-full border-[3px] border-black/20 border-t-black dark:border-white/25 dark:border-t-white animate-spin"
        style={{
          width: px,
          height: px,
        }}
      />
    </div>
  );
};

