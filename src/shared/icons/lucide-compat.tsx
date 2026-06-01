import type { ComponentType, SVGProps } from "react";
import {
  ArchiveIcon as Archive,
  ArrowClockwiseIcon as ArrowClockwise,
  ArrowLeftIcon as ArrowLeft,
  ArrowCounterClockwiseIcon as ArrowCounterClockwise,
  CalendarIcon as Calendar,
  CameraIcon as Camera,
  CaretDownIcon as CaretDown,
  CaretLeftIcon as CaretLeft,
  CaretRightIcon as CaretRight,
  ChatCircleIcon as ChatCircle,
  CircleIcon as Circle,
  CheckIcon as Check,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  ClockCounterClockwiseIcon as ClockCounterClockwise,
  DotsThreeIcon as DotsThree,
  DownloadIcon as Download,
  EyeIcon as Eye,
  EyeSlashIcon as EyeSlash,
  FileIcon as File,
  FileTextIcon as FileText,
  FolderSimpleIcon as FolderSimple,
  FunnelIcon as Funnel,
  GlobeIcon as Globe,
  ImageIcon as Image,
  InfoIcon as Info,
  ListIcon as List,
  MagnifyingGlassIcon as MagnifyingGlass,
  MagnifyingGlassMinusIcon as MagnifyingGlassMinus,
  MagnifyingGlassPlusIcon as MagnifyingGlassPlus,
  MoonIcon as Moon,
  MusicNoteIcon as MusicNote,
  PaperPlaneTiltIcon as PaperPlaneTilt,
  PencilIcon as Pencil,
  PlusIcon as Plus,
  ShieldIcon as Shield,
  ShieldWarningIcon as ShieldWarning,
  SlidersHorizontalIcon as SlidersHorizontal,
  SparkleIcon as Sparkle,
  SpinnerGapIcon as SpinnerGap,
  SquaresFourIcon as SquaresFour,
  SunIcon as Sun,
  TranslateIcon as Translate,
  TrashIcon as Trash,
  UploadIcon as Upload,
  UserIcon as User,
  UsersThreeIcon as UsersThree,
  VideoIcon as Video,
  WarningIcon as Warning,
  WarningCircleIcon as WarningCircle,
  XIcon as X,
  XCircleIcon as XCircle,
} from "@phosphor-icons/react";

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
};
export type LucideIcon = ComponentType<LucideProps>;
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
export { Circle as MousePointer };
