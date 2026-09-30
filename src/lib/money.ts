import { currencyInfo } from "./currencies";

/**
 * Money is stored as integer minor units (kobo for NGN, cents for USD).
 * Floats only appear at the edges: parsing what people type and formatting for display.
 */

const SYMBOL_TO_CODE: Record<string, string> = {
  "₦": "NGN",
  $: "USD",
  "£": "GBP",
  "€": "EUR",
};

const WORD_TO_CODE: Record<string, string> = {
  naira: "NGN",
  ngn: "NGN",
  dollar: "USD",
  dollars: "USD",
  usd: "USD",
  pound: "GBP",
  pounds: "GBP",
  gbp: "GBP",
  euro: "EUR",
  euros: "EUR",
  eur: "EUR",
  cedi: "GHS",
  cedis: "GHS",
};

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mil: 1_000_000,
  million: 1_000_000,
  b: 1_000_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

export type ParsedAmount = { major: number; currency?: string };

/**
 * Parses things people actually type or say: "4.5k", "₦350,000", "350k naira", "$20", "2.3m", "1,200.50".
 * Returns null when there is no number in the input.
 */
export function parseAmount(input: string): ParsedAmount | null {
  let text = input.trim().toLowerCase();
  if (!text) return null;

  let currency: string | undefined;
  for (const [sym, code] of Object.entries(SYMBOL_TO_CODE)) {
    if (text.includes(sym)) {
      currency = code;
      text = text.replaceAll(sym, " ");
    }
  }
  const codeMatch = text.match(/\b([a-z]{3,8})\b/g);
  if (codeMatch) {
    for (const word of codeMatch) {
      if (WORD_TO_CODE[word]) {
        currency = WORD_TO_CODE[word];
        text = text.replace(new RegExp(`\\b${word}\\b`), " ");
      }
    }
  }

  const m = text.match(/(-?\d[\d,]*(?:\.\d+)?)\s*(k|m|mil|million|thousand|bn|b|billion)?\b/);
  if (!m) return null;
  const numeric = Number(m[1].replaceAll(",", ""));
  if (!Number.isFinite(numeric)) return null;
  const mult = m[2] ? MULTIPLIERS[m[2]] : 1;
  return { major: Math.abs(numeric * mult), currency };
}

export function toMinor(major: number, currency: string): number {
  const { exponent } = currencyInfo(currency);
  return Math.round(major * 10 ** exponent);
}

export function toMajor(minor: number, currency: string): number {
  const { exponent } = currencyInfo(currency);
  return minor / 10 ** exponent;
}

/** Convert minor units between currencies. `rate` is units of `to` per 1 unit of `from`. */
export function convertMinor(minor: number, from: string, to: string, rate: number): number {
  if (from === to) return minor;
  return toMinor(toMajor(minor, from) * rate, to);
}

type FormatOptions = {
  sign?: "auto" | "always" | "never";
  compact?: boolean;
  /** Hide minor units when the value is a whole number. Defaults to true. */
  trimZeros?: boolean;
};

export function formatMoney(minor: number, currency: string, opts: FormatOptions = {}): string {
  const info = currencyInfo(currency);
  const major = toMajor(minor, currency);
  const whole = Number.isInteger(major);
  const trim = opts.trimZeros ?? true;
  const fmt = new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.code,
    currencyDisplay: "narrowSymbol",
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : trim && whole ? 0 : info.exponent,
    maximumFractionDigits: opts.compact ? 1 : info.exponent,
    signDisplay: opts.sign === "always" ? "exceptZero" : opts.sign === "never" ? "never" : "auto",
  });
  // A real minus sign, never a hyphen.
  return fmt.format(major).replace(/^-/, "−");
}

/** Formatting used for signed transaction amounts in lists. Uses a real minus sign. */
export function formatSigned(minor: number, currency: string, type: "income" | "expense" | "transfer"): string {
  const base = formatMoney(Math.abs(minor), currency);
  if (type === "income") return `+${base}`;
  if (type === "expense") return `−${base}`;
  return base;
}
