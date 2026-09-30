import { RevealObserver } from "@/components/marketing/reveal-observer";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { getSession } from "@/server/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  return (
    <div className="bg-white">
      <SiteNav signedIn={!!session} />
      <main className="-mt-[76px] md:-mt-[104px]">{children}</main>
      <SiteFooter />
      <RevealObserver />
    </div>
  );
}
