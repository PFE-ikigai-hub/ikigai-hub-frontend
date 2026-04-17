import {
  Pulse,
  Archive,
  SealCheck,
  CalendarBlank,
  Circle,
  Eye,
  ChatText,
  PauseCircle,
  CheckCircle,
  UserCheck,
  UserMinus,
} from "@phosphor-icons/react";
import type { ElementType } from "react";

export function getStatusIcon(status: string): ElementType {
  switch (status) {
    // Project
    case "EN_COURS":
      return Pulse;
    case "TERMINE":
      return CheckCircle;
    case "ARCHIVE":
      return Archive;
    case "EN_ATTENTE":
      return PauseCircle;
    case "PLANIFIE":
      return CalendarBlank;

    // Deliverable
    case "EN_REVUE":
      return Eye;
    case "VALIDE":
      return SealCheck;

    // Version
    case "REVIEWED":
      return ChatText;
    case "VALIDATED":
      return SealCheck;

    // User activation (admin)
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
