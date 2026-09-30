"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CategoryIcon, ICON_NAMES } from "@/components/ui/category-icon";
import { Field, FormError, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { archiveCategory, saveCategory } from "@/server/actions";

type Cat = { id: string; name: string; kind: "income" | "expense"; icon: string; archived: boolean; count: number };

export function CategoriesView({ categories }: { categories: Cat[] }) {
  const [editing, setEditing] = useState<Cat | null>(null);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [open, setOpen] = useState(false);
  const list = (k: "income" | "expense") => categories.filter((c) => c.kind === k && !c.archived);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {(["expense", "income"] as const).map((k) => (
          <section key={k} className="rounded-[28px] bg-parchment p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow text-graphite">{list(k).length} categories</p>
                <h2 className="mt-1 text-[22px] font-medium">{k === "expense" ? "Spending" : "Income"}</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setKind(k);
                  setOpen(true);
                }}
              >
                Add
              </Button>
            </div>
            <ul className="divide-y divide-ash">
              {list(k).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c);
                      setKind(c.kind);
                      setOpen(true);
                    }}
                    className="group flex w-full items-center gap-3 py-3 text-left"
                  >
                    <CategoryIcon name={c.icon} size="sm" tone="white" />
                    <span className="flex-1 truncate text-[15px] group-hover:underline">{c.name}</span>
                    <span className="text-[13px] text-graphite">
                      {c.count} {c.count === 1 ? "entry" : "entries"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {categories.some((c) => c.archived) && (
        <details className="rounded-[28px] bg-parchment px-6 py-5 text-[15px]">
          <summary className="cursor-pointer font-medium">Hidden categories</summary>
          <ul className="mt-4 flex flex-wrap gap-2">
            {categories
              .filter((c) => c.archived)
              .map((c) => (
                <li key={c.id}>
                  <UnhideButton cat={c} />
                </li>
              ))}
          </ul>
        </details>
      )}

      <CategorySheet key={`${editing?.id ?? "new"}-${kind}-${open}`} open={open} onClose={() => setOpen(false)} category={editing} kind={kind} />
    </>
  );
}

function UnhideButton({ cat }: { cat: Cat }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          await archiveCategory(cat.id, false);
          router.refresh();
        })
      }
    >
      Show {cat.name}
    </Button>
  );
}

function CategorySheet({ open, onClose, category, kind }: { open: boolean; onClose: () => void; category: Cat | null; kind: "income" | "expense" }) {
  const router = useRouter();
  const [icon, setIcon] = useState(category?.icon ?? "circle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [hiding, startHide] = useTransition();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : `New ${kind === "income" ? "income" : "spending"} category`}
      footer={
        <div className="flex items-center gap-2.5">
          {category && (
            <Button
              variant="danger"
              loading={hiding}
              onClick={() =>
                startHide(async () => {
                  const res = await archiveCategory(category.id, true);
                  if (!res.ok) return setError(res.error);
                  onClose();
                  router.refresh();
                })
              }
            >
              Hide
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={pending}>
            Save
          </Button>
        </div>
      }
    >
      <form
        id="category-form"
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name"));
          start(async () => {
            // Perk keeps one accent, so category colour is fixed to ink; icons do the identifying.
            const res = await saveCategory(category?.id ?? null, { name, kind: category?.kind ?? kind, icon, color: "#14140f" });
            if (!res.ok) return setError(res.error);
            onClose();
            router.refresh();
          });
        }}
      >
        <div className="flex items-end gap-3">
          <CategoryIcon name={icon} size="lg" tone="lime" />
          <Field label="Name" className="flex-1">
            {(id) => <Input id={id} name="name" defaultValue={category?.name} required maxLength={40} />}
          </Field>
        </div>
        <fieldset>
          <legend className="mb-3 text-[14px] font-medium">Icon</legend>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
            {ICON_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setIcon(n)}
                aria-pressed={icon === n}
                aria-label={n.replaceAll("-", " ")}
                className={cn("inline-flex justify-center rounded-full p-0.5", icon === n ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-ash")}
              >
                <CategoryIcon name={n} size="sm" tone={icon === n ? "lime" : "parchment"} />
              </button>
            ))}
          </div>
        </fieldset>
        {error && <FormError>{error}</FormError>}
      </form>
    </Sheet>
  );
}
