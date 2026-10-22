/**
 * Tests for the AES-256-GCM encryption helpers and legacy CBC read path (issue #1553).
 *
 * Covers:
 *  - GCM round-trip encrypt/decrypt, with the documented iv:tag:ciphertext format.
 *  - Tamper detection: modified ciphertext or auth tag is rejected.
 *  - Legacy AES-256-CBC (iv:ciphertext) values still decrypt.
 *  - Malformed input is rejected.
 */
import crypto from "crypto";

jest.mock("../config", () => ({
  config: {
    encryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
}));

import { config } from "../config";
import { encrypt, decrypt } from "../utils/encryption";

const flipFirstHexChar = (hex: string): string =>
  (hex[0] === "0" ? "1" : "0") + hex.slice(1);

describe("encryption utils", () => {
  describe("GCM round-trip", () => {
    it("decrypts what it encrypted", () => {
      const plaintext = "user@example.com";

      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("round-trips unicode and empty strings", () => {
      expect(decrypt(encrypt("héllo wörld 🌍"))).toBe("héllo wörld 🌍");
      expect(decrypt(encrypt(""))).toBe("");
    });

    it("produces the iv:authTag:ciphertext format with a 12-byte IV and 16-byte tag", () => {
      const parts = encrypt("secret").split(":");

      expect(parts).toHaveLength(3);
      const [ivHex, tagHex, cipherHex] = parts;
      expect(ivHex).toMatch(/^[0-9a-f]{24}$/);
      expect(tagHex).toMatch(/^[0-9a-f]{32}$/);
      expect(cipherHex).toMatch(/^[0-9a-f]+$/);
    });

    it("uses a fresh IV, so the same plaintext never encrypts to the same value", () => {
      const first = encrypt("same input");
      const second = encrypt("same input");

      expect(first).not.toBe(second);
      expect(first.split(":")[0]).not.toBe(second.split(":")[0]);
    });
  });

  describe("tamper detection", () => {
    it("throws when the ciphertext has been modified", () => {
      const [ivHex, tagHex, cipherHex] = encrypt("sensitive").split(":");
      const tampered = [ivHex, tagHex, flipFirstHexChar(cipherHex)].join(":");

      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws when the auth tag has been modified", () => {
      const [ivHex, tagHex, cipherHex] = encrypt("sensitive").split(":");
      const tampered = [ivHex, flipFirstHexChar(tagHex), cipherHex].join(":");

      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws when the IV has been modified", () => {
      const [ivHex, tagHex, cipherHex] = encrypt("sensitive").split(":");
      const tampered = [flipFirstHexChar(ivHex), tagHex, cipherHex].join(":");

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("legacy AES-256-CBC format", () => {
    it("decrypts iv:ciphertext values written with the old CBC scheme", () => {
      const key = Buffer.from(config.encryptionKey, "hex");
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      const legacy = `${iv.toString("hex")}:${Buffer.concat([
        cipher.update("legacy value", "utf8"),
        cipher.final(),
      ]).toString("hex")}`;

      expect(decrypt(legacy)).toBe("legacy value");
    });
  });

  describe("malformed input", () => {
    it.each([
      ["no separators", "deadbeef"],
      ["four parts", "aa:bb:cc:dd"],
      ["empty string", ""],
    ])("rejects %s with an invalid format error", (_label, input) => {
      expect(() => decrypt(input)).toThrow("Invalid encrypted text format");
    });
  });
});
