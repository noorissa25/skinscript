import { describe, expect, it } from "vitest";
import { fmt, LOCALES } from "@/i18n/locales";
import { en } from "@/i18n/messages/en";
import { messages } from "@/i18n/messages";
import { samples } from "@/lib/samples";

/** Flatten nested messages to "a.b.c" -> string for comparison. */
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const source = flatten(en);

describe("translations", () => {
  it("has a message file for every listed locale", () => {
    expect(Object.keys(messages).sort()).toEqual(LOCALES.map((l) => l.code).sort());
  });

  for (const { code } of LOCALES) {
    it(`${code}: has every key, nothing empty, and keeps every {placeholder}`, () => {
      const flat = flatten(messages[code]);
      expect(Object.keys(flat).sort()).toEqual(Object.keys(source).sort());
      for (const [key, text] of Object.entries(flat)) {
        expect(text.trim(), key).not.toBe("");
        expect(placeholders(text), key).toEqual(placeholders(source[key]));
      }
    });
  }

  it("translates every sample label", () => {
    expect(Object.keys(en.checker.samples).sort()).toEqual(samples.map((s) => s.id).sort());
  });

  it("gives every language the full disclaimer and every FAQ item", () => {
    for (const { code } of LOCALES) {
      expect(messages[code].disclaimer.length, code).toBeGreaterThan(100);
      expect(messages[code].faq.items.length, code).toBe(en.faq.items.length);
    }
  });
});

describe("fmt", () => {
  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fmt("Recognized {a} of {b}", { a: 3, b: 4 })).toBe("Recognized 3 of 4");
    expect(fmt("Hi {name}", {})).toBe("Hi {name}");
  });
});
