import {

  PulseIcon as Pulse,
  ArchiveIcon as Archive,
  SealCheckIcon as SealCheck,
  CalendarBlankIcon as CalendarBlank,
  CircleIcon as Circle,
  EyeIcon as Eye,
  ChatTextIcon as ChatText,
  PauseCircleIcon as PauseCircle,
  CheckCircleIcon as CheckCircle,
  UserCheckIcon as UserCheck,
  UserMinusIcon as UserMinus,
} from "@phosphor-icons/react";
import type { ElementType } from "react";

export function getStatusIcon(status: string): ElementType {
  switch (status) {
    case "EN_COURS":
      return Pulse;
    case "TERMINE":
      return CheckCircle;
    case "ARCHIVE":
      return Archive;
    case "EN_ATTENTE":
      return PauseCircle;
    case "EN_REVUE":
      return Eye;
    case "VALIDE":
      return SealCheck;
    case "REVIEWED":
      return ChatText;
    case "VALIDATED":
      return SealCheck;
    case "actif":
    case "ACTIVE":
      return UserCheck;
    case "inactif":
    case "INACTIVE":
      return UserMinus;

    default:
      return Circle;
  }
}
