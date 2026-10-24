import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn() }));

import { isAllowedCertificateFile, isAllowedPhotoFile, isAllowedQcAttachmentFile } from "./storage";

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("uploads must pass both the extension and the declared type", () => {
  it("accepts ordinary photos, including a phone HEIC with no declared type", () => {
    expect(isAllowedPhotoFile(file("a.jpg", "image/jpeg"))).toBe(true);
    expect(isAllowedPhotoFile(file("IMG_1.HEIC", ""))).toBe(true);
    expect(isAllowedPhotoFile(file("IMG_2.heic", "application/octet-stream"))).toBe(true);
  });

  it("rejects a page or script dressed up as an image", () => {
    expect(isAllowedPhotoFile(file("page.html", "image/jpeg"))).toBe(false);
    expect(isAllowedPhotoFile(file("a.jpg", "text/html"))).toBe(false);
    expect(isAllowedPhotoFile(file("noextension", "image/png"))).toBe(false);
  });

  it("applies the same rule to certificates and QC attachments", () => {
    expect(isAllowedCertificateFile(file("cert.pdf", "application/pdf"))).toBe(true);
    expect(isAllowedCertificateFile(file("cert.exe", "application/pdf"))).toBe(false);
    expect(isAllowedQcAttachmentFile(file("coa.pdf", "application/pdf"))).toBe(true);
    expect(isAllowedQcAttachmentFile(file("coa.svg", "image/png"))).toBe(false);
  });
});
