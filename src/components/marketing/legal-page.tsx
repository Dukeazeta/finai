import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <section className="bg-parchment pt-[128px] pb-16 md:pt-[168px]">
        <div className="shell max-w-[860px]">
          <p className="eyebrow text-graphite">Updated {updated}</p>
          <h1 className="mt-3 text-[clamp(3rem,7vw,5rem)] leading-[0.9] font-medium tracking-[-0.03em]">{title}</h1>
        </div>
      </section>
      <article className="shell max-w-[860px] py-16">
        <div className="flex flex-col gap-4 text-[17px] leading-[1.65] [&_h2]:mt-8 [&_h2]:text-[28px] [&_h2]:leading-[1.14] [&_h2]:font-medium [&_h2]:tracking-[-0.03em] [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </article>
    </>
  );
}
