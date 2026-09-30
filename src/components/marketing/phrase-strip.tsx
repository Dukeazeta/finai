const PHRASES = [
  "Spent 4.5k on suya",
  "Bolt to work, 3,200",
  "Salary came in, 350k",
  "Paid 12k for MTN data",
  "Upwork paid me $400",
  "Moved 50k to savings",
  "Keke to school, 500",
  "Netflix renewed, 7,000",
  "Sold two bags of rice, 140k",
  "Undo the last one",
];

/** Stands where perk.com shows its customer logo strip: things people can say to FinAI. */
export function PhraseStrip() {
  const row = [...PHRASES, ...PHRASES];
  return (
    <div className="relative flex h-[72px] items-center overflow-hidden bg-[#dcdcd2]">
      <p className="relative z-10 hidden h-full shrink-0 items-center bg-[#dcdcd2] pr-8 pl-[max(16px,calc((100vw-1200px)/2))] text-[15px] font-medium md:flex">
        Things you can say
      </p>
      <div className="flex min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <ul className="flex w-max animate-[marquee_48s_linear_infinite] items-center gap-10 pr-10 motion-reduce:animate-none" aria-label="Example phrases">
          {row.map((p, i) => (
            <li key={i} aria-hidden={i >= PHRASES.length} className="text-[15px] whitespace-nowrap text-graphite">
              &ldquo;{p}&rdquo;
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
