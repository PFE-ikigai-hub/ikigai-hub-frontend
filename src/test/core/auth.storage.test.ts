import { describe, expect, it, vi } from "vitest";
import { readLastRole, writeLastRole } from "@/core/auth/auth.storage";

describe("auth.storage", () => {
  it("reads and writes valid roles", () => {
    writeLastRole("ADMIN");
    expect(readLastRole()).toBe("ADMIN");

    writeLastRole("CLIENT");
    expect(readLastRole()).toBe("CLIENT");
  });

  it("returns null for unknown stored value", () => {
    window.localStorage.setItem("ikigai:lastRole", "UNKNOWN");
    expect(readLastRole()).toBeNull();
  });

  it("removes role when writing null", () => {
    window.localStorage.setItem("ikigai:lastRole", "ADMIN");
    writeLastRole(null);
    expect(window.localStorage.getItem("ikigai:lastRole")).toBeNull();
    expect(readLastRole()).toBeNull();
  });

  it("swallows storage read/write errors", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(readLastRole()).toBeNull();
    getSpy.mockRestore();

    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(() => writeLastRole("EMPLOYE")).not.toThrow();
    setSpy.mockRestore();
  });
});
