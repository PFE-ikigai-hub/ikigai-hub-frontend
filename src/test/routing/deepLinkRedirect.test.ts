import { describe, expect, it, vi } from "vitest";
import {
  forceRelogin,
  hasIdentityMismatch,
  normalizeRole,
  parseCurrentUserId,
  parseExpectedUserId,
  setWrongAccountNotice,
} from "@/shared/components/routing/deepLinkRedirect";

describe("deepLinkRedirect", () => {
  it("normalizes and parses values", () => {
    expect(normalizeRole("employee")).toBe("EMPLOYE");
    expect(normalizeRole("client")).toBe("CLIENT");
    expect(normalizeRole(undefined)).toBeUndefined();

    expect(parseExpectedUserId("42")).toBe(42);
    expect(parseExpectedUserId("abc")).toBeNull();
    expect(parseCurrentUserId("7")).toBe(7);
    expect(parseCurrentUserId(undefined)).toBeNull();
  });

  it("detects role and user mismatches", () => {
    const params = new URLSearchParams("expectedRole=CLIENT&expectedUserId=15");
    const mismatch = hasIdentityMismatch(params, "ADMIN", "9");
    expect(mismatch.roleMismatch).toBe(true);
    expect(mismatch.userMismatch).toBe(true);
    expect(mismatch.normalizedRole).toBe("ADMIN");

    const ok = hasIdentityMismatch(params, "CLIENT", "15");
    expect(ok.roleMismatch).toBe(false);
    expect(ok.userMismatch).toBe(false);
  });

  it("stores wrong-account notice", () => {
    setWrongAccountNotice();
    expect(sessionStorage.getItem("ikigai:authNotice")).toContain("correct account");
  });

  it("forces relogin and always navigates to login", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const goToLogin = vi.fn();

    await forceRelogin(logout, goToLogin);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(goToLogin).toHaveBeenCalled();
    expect(sessionStorage.getItem("ikigai:authNotice")).toContain("correct account");
  });
});
