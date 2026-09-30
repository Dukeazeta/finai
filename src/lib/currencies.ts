export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  /** Number of minor units (kobo, cents). */
  exponent: number;
  locale: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: "NGN", name: "Nigerian naira", symbol: "₦", exponent: 2, locale: "en-NG" },
  { code: "USD", name: "US dollar", symbol: "$", exponent: 2, locale: "en-US" },
  { code: "GBP", name: "British pound", symbol: "£", exponent: 2, locale: "en-GB" },
  { code: "EUR", name: "Euro", symbol: "€", exponent: 2, locale: "en-IE" },
  { code: "CAD", name: "Canadian dollar", symbol: "CA$", exponent: 2, locale: "en-CA" },
  { code: "GHS", name: "Ghanaian cedi", symbol: "GH₵", exponent: 2, locale: "en-GH" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh", exponent: 2, locale: "en-KE" },
  { code: "ZAR", name: "South African rand", symbol: "R", exponent: 2, locale: "en-ZA" },
  { code: "XOF", name: "West African CFA franc", symbol: "CFA", exponent: 0, locale: "fr-SN" },
  { code: "AED", name: "UAE dirham", symbol: "AED", exponent: 2, locale: "en-AE" },
  { code: "CNY", name: "Chinese yuan", symbol: "¥", exponent: 2, locale: "zh-CN" },
  { code: "JPY", name: "Japanese yen", symbol: "¥", exponent: 0, locale: "ja-JP" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyInfo(code: string): CurrencyInfo {
  return byCode.get(code.toUpperCase()) ?? { code, name: code, symbol: code, exponent: 2, locale: "en-NG" };
}

export function isSupportedCurrency(code: string): boolean {
  return byCode.has(code.toUpperCase());
}
