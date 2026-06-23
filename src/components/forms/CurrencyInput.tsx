import type { Currency } from "@/types/domain";

export function CurrencyInput({ currency, amount }: { currency: Currency; amount: number }) {
  return (
    <div className="flex overflow-hidden rounded border border-slate-200 dark:border-slate-800">
      <span className="bg-slate-100 px-3 py-2 text-sm font-semibold dark:bg-slate-900">{currency}</span>
      <input className="w-32 bg-white px-3 py-2 text-sm outline-none dark:bg-slate-950" defaultValue={amount} type="number" />
    </div>
  );
}
