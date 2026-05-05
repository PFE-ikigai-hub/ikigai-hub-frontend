// Ce fichier gere une partie du frontend.
import { PreloaderIndicator } from "@/shared/components/ui/PreloaderIndicator";


export type PreloaderProps = {
  className?: string;
  size?: number;
};
export default function Preloader({ className = "", size = 1 }: PreloaderProps) {
  void size;
  return <PreloaderIndicator className={className} size={1} />;
}