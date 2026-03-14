import { isSafeRedirect } from "./redirectUtils";
import { describe, it, expect } from "vitest";

describe("isSafeRedirect", () => {
  it("returns true for safe relative paths", () => {
    expect(isSafeRedirect("/")).toBe(true);
    expect(isSafeRedirect("/account")).toBe(true);
    expect(isSafeRedirect("/account/orders")).toBe(true);
    expect(isSafeRedirect("/store/my-restaurant")).toBe(true);
  });

  it("returns false for null or undefined", () => {
    expect(isSafeRedirect(null)).toBe(false);
    expect(isSafeRedirect(undefined)).toBe(false);
  });

  it("returns false for protocol-relative URLs", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
    expect(isSafeRedirect("%2F%2Fevil.com")).toBe(false);
  });

  it("returns false for absolute URLs", () => {
    expect(isSafeRedirect("http://evil.com")).toBe(false);
    expect(isSafeRedirect("https://evil.com")).toBe(false);
  });

  it("returns false for paths that don't start with /", () => {
    expect(isSafeRedirect("evil.com")).toBe(false);
    expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
  });

  it("returns false for encoded absolute URLs", () => {
    expect(isSafeRedirect("https%3A%2F%2Fevil.com")).toBe(false);
  });
});
