import { Logo } from "@/components/logo";
import { ReceiptCard } from "@/components/receipt-card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 gap-3 bg-parchment p-3 lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-3 py-4 sm:px-6">
        <Logo />
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          <div className="rounded-[28px] bg-white p-6 sm:p-10">{children}</div>
        </main>
      </div>

      <aside aria-hidden className="relative hidden flex-col justify-between overflow-hidden rounded-[28px] bg-lime p-12 lg:flex">
        <p className="eyebrow">Example</p>
        <div>
          <p className="text-[60px] leading-[1] font-medium tracking-[-0.03em]">&ldquo;Spent 4.5k on suya with my Opay card.&rdquo;</p>
          <p className="mt-5 text-[16px]">Say it like that. FinAI writes it down.</p>
          <div className="mt-10 flex max-w-[400px] flex-col gap-3">
            <ReceiptCard status="Logged" type="expense" amountMinor={450000} currency="NGN" category="Food and drinks" icon="utensils" meta="Suya · Opay · Today" className="border-ink/15" />
            <ReceiptCard status="Logged" type="income" amountMinor={35000000} currency="NGN" category="Salary" icon="briefcase" meta="GTBank · 28 Sep" className="translate-x-8 border-ink/15" />
          </div>
        </div>
      </aside>
    </div>
  );
}
