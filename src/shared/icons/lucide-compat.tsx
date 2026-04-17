import type { ComponentType, SVGProps } from "react";
import {
  Archive,
  ArrowClockwise,
  ArrowLeft,
  ArrowCounterClockwise,
  Calendar,
  Camera,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircle,
  Circle,
  Check,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  DotsThree,
  Download,
  Eye,
  EyeSlash,
  File,
  FileText,
  FolderSimple,
  Funnel,
  Globe,
  Image,
  Info,
  List,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Moon,
  MusicNote,
  PaperPlaneTilt,
  Pencil,
  Plus,
  Shield,
  ShieldWarning,
  SlidersHorizontal,
  Sparkle,
  SpinnerGap,
  SquaresFour,
  Sun,
  Translate,
  Trash,
  Upload,
  User,
  UsersThree,
  Video,
  Warning,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
};
export type LucideIcon = ComponentType<LucideProps>;

// direct names used in the app
export {
  Archive,
  Calendar,
  Camera,
  Circle,
  Check,
  Clock,
  Download,
  Eye,
  File,
  FileText,
  Globe,
  Image,
  Info,
  List,
  Moon,
  Pencil,
  Plus,
  Shield,
  SlidersHorizontal,
  Sun,
  Upload,
  User,
  Video,
  X,
  XCircle,
};

// lucide -> phosphor aliases used in the app
export { WarningCircle as AlertCircle };
export { Warning as AlertTriangle };
export { ArrowLeft };
export { CaretLeft as ChevronLeft };
export { CaretRight as ChevronRight };
export { CaretDown as ChevronDown };
export { ShieldWarning as ShieldAlert };
export { SquaresFour as LayoutGrid };
export { FolderSimple as FolderKanban };
export { ArrowCounterClockwise as RotateCcw };
export { MagnifyingGlass as Search };
export { Funnel as Filter };
export { Trash as Trash2 };
export { UsersThree as Users };
export { SpinnerGap as Loader2 };
export { DotsThree as MoreHorizontal };
export { Translate as Languages };
export { ChatCircle as MessageCircle };
export { MusicNote as Music };
export { EyeSlash as EyeOff };
export { Sparkle as Sparkles };
export { CheckCircle as CheckCircle2 };
export { WarningCircle as CircleAlert };
export { Warning as TriangleAlert };
export { MagnifyingGlassPlus as ZoomIn };
export { MagnifyingGlassMinus as ZoomOut };
export { ArrowClockwise as RefreshCw };
export { ClockCounterClockwise as History };
export { PaperPlaneTilt as Send };
export { FileText as FileType };
export { File as FileClock };
// close enough visual mapping for pointer icon in employee feedback
export { Circle as MousePointer };
