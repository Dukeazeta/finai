"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Side sheet on desktop, bottom sheet on phones, on native <dialog>. Separated by backdrop and border, never shadow. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="sheet-title"
      style={{ ["--sheet-w" as string]: `${width}px` }}
      className={cn(
        "m-0 max-h-none max-w-none flex-col border border-ash bg-white p-0 text-ink backdrop:bg-ink/40 open:flex",
        "fixed inset-x-0 top-auto bottom-0 max-h-[92dvh] w-full rounded-t-[28px]",
        "md:inset-y-3 md:right-3 md:left-auto md:h-[calc(100dvh-24px)] md:max-h-none md:w-[var(--sheet-w)] md:rounded-[28px]",
      )}
    >
      <div className="flex items-start gap-4 px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <h2 id="sheet-title" className="text-[28px] leading-[1.14] font-medium tracking-[-0.03em]">
            {title}
          </h2>
          {description && <div className="mt-1.5 text-[14px] text-graphite">{description}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-parchment"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      {footer && <div className="border-t border-ash px-6 py-4">{footer}</div>}
    </dialog>
  );
}
