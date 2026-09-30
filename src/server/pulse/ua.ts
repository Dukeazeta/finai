/** Small user agent reader: enough for "Chrome on Android, mobile" without a dependency. */

export type Agent = { browser: string; os: string; device: "mobile" | "tablet" | "desktop"; bot: boolean };

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pagespeed|curl|wget|python|node-fetch|axios|vercel-screenshot/i;

export function readAgent(ua: string | null | undefined): Agent {
  const s = ua ?? "";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /SamsungBrowser/.test(s)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(s)
          ? "Firefox"
          : /CriOS|Chrome\//.test(s)
            ? "Chrome"
            : /Safari\//.test(s)
              ? "Safari"
              : "Other";
  const os = /Windows/.test(s)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(s)
      ? "iOS"
      : /Android/.test(s)
        ? "Android"
        : /Mac OS X|Macintosh/.test(s)
          ? "macOS"
          : /CrOS/.test(s)
            ? "ChromeOS"
            : /Linux/.test(s)
              ? "Linux"
              : "Other";
  const device = /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s)) ? "tablet" : /Mobi|iPhone|Android/.test(s) ? "mobile" : "desktop";
  return { browser, os, device, bot: !s || BOT.test(s) };
}
