import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";


export type PreloaderProps = {
  className?: string;
  size?: number;
};

// Keep the Client dashboard preloader visuals as the source of truth.
export default function Preloader({ className = "", size = 1 }: PreloaderProps) {
  void size;
  return <PreloaderIndicator className={className} size={1} />;
}
