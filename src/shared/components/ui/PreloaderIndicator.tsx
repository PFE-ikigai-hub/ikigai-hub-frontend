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
        className="relative rounded-full"
        style={{
          width: px,
          height: px,
          background:
            "conic-gradient(from 0deg, rgba(197,16,234,0.95), rgba(104,147,232,0.95), rgba(5,58,163,0.95), rgba(197,16,234,0.95))",
          animation: "spin 900ms linear infinite",
        }}
      >
        <span
          className="absolute inset-[3px] rounded-full bg-[#ffffff] dark:bg-[#0a0a0b]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

