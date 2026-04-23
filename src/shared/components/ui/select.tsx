import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/utils/cn";


export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-800 dark:bg-stone-950 dark:ring-offset-stone-950 dark:placeholder:text-stone-400 dark:focus:ring-stone-300",
          isOpen && "ring-2 ring-stone-950 ring-offset-2"
        )}
      >
        <span className={cn(!selectedOption && "text-stone-500")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-800 dark:bg-stone-950">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-colors hover:bg-stone-100 dark:hover:bg-stone-800",
                selectedValue === option.value && "bg-stone-100 dark:bg-stone-800"
              )}
            >
              <span className="flex-1">{option.label}</span>
              {selectedValue === option.value && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
