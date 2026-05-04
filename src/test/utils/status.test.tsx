import { describe, expect, it } from "vitest";
import {
  ArchiveIcon,
  CalendarBlankIcon,
  ChatTextIcon,
  CheckCircleIcon,
  CircleIcon,
  EyeIcon,
  PauseCircleIcon,
  PulseIcon,
  SealCheckIcon,
  UserCheckIcon,
  UserMinusIcon,
} from "@phosphor-icons/react";
import { getStatusIcon } from "@/shared/utils/status";

describe("getStatusIcon", () => {
  it("maps project statuses", () => {
    expect(getStatusIcon("EN_COURS")).toBe(PulseIcon);
    expect(getStatusIcon("TERMINE")).toBe(CheckCircleIcon);
    expect(getStatusIcon("ARCHIVE")).toBe(ArchiveIcon);
    expect(getStatusIcon("EN_ATTENTE")).toBe(PauseCircleIcon);
    expect(getStatusIcon("PLANIFIE")).toBe(CalendarBlankIcon);
  });

  it("maps deliverable and version statuses", () => {
    expect(getStatusIcon("EN_REVUE")).toBe(EyeIcon);
    expect(getStatusIcon("VALIDE")).toBe(SealCheckIcon);
    expect(getStatusIcon("REVIEWED")).toBe(ChatTextIcon);
    expect(getStatusIcon("VALIDATED")).toBe(SealCheckIcon);
  });

  it("maps user activation statuses and default", () => {
    expect(getStatusIcon("actif")).toBe(UserCheckIcon);
    expect(getStatusIcon("ACTIVE")).toBe(UserCheckIcon);
    expect(getStatusIcon("inactif")).toBe(UserMinusIcon);
    expect(getStatusIcon("INACTIVE")).toBe(UserMinusIcon);
    expect(getStatusIcon("UNKNOWN")).toBe(CircleIcon);
  });
});
