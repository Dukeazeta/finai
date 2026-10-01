import { describe, expect, it } from "vitest";
import { convertMinor, formatMoney, formatSigned, maskMoney, parseAmount, toMajor, toMinor } from "./money";

describe("parseAmount", () => {
  it.each([
    ["4.5k", 4500, undefined],
    ["₦350,000", 350000, "NGN"],
    ["350k naira", 350000, "NGN"],
    ["$20", 20, "USD"],
    ["2.3m", 2300000, undefined],
    ["1,200.50", 1200.5, undefined],
    ["20 dollars", 20, "USD"],
    ["£12.99", 12.99, "GBP"],
    ["spent 7500 on data", 7500, undefined],
    ["1.2 million", 1200000, undefined],
  ])("parses %s", (input, major, currency) => {
    const r = parseAmount(input);
    expect(r).not.toBeNull();
    expect(r!.major).toBeCloseTo(major, 6);
    expect(r!.currency).toBe(currency);
  });

  it("returns null when there is no number", () => {
    expect(parseAmount("lunch")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("minor units", () => {
  it("round trips NGN and USD", () => {
    expect(toMinor(4500, "NGN")).toBe(450000);
    expect(toMajor(450000, "NGN")).toBe(4500);
    expect(toMinor(12.99, "USD")).toBe(1299);
  });

  it("avoids float drift", () => {
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(toMinor(1200.5, "NGN")).toBe(120050);
  });

  it("handles zero exponent currencies", () => {
    expect(toMinor(1500, "JPY")).toBe(1500);
  });
});

describe("convertMinor", () => {
  it("is identity for the same currency", () => {
    expect(convertMinor(1234, "NGN", "NGN", 99)).toBe(1234);
  });

  it("converts USD cents to kobo", () => {
    // $20 at 1,600 NGN per USD = ₦32,000
    expect(convertMinor(2000, "USD", "NGN", 1600)).toBe(3_200_000);
  });
});

describe("formatting", () => {
  it("formats naira without trailing zeros", () => {
    expect(formatMoney(450000, "NGN")).toBe("₦4,500");
  });

  it("keeps kobo when present", () => {
    expect(formatMoney(120050, "NGN")).toBe("₦1,200.50");
  });

  it("signs transaction amounts", () => {
    expect(formatSigned(450000, "NGN", "expense")).toBe("−₦4,500");
    expect(formatSigned(35000000, "NGN", "income")).toBe("+₦350,000");
  });
});

describe("hiding amounts", () => {
  it("keeps the currency symbol and drops the digits", () => {
    expect(maskMoney("NGN")).toBe("₦••••");
    expect(maskMoney("USD", "−")).toBe("−$••••");
  });
});
