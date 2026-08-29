import type { Signal } from "@/lib/api";

export function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "buy";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
            isBuy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {signal.direction}
        </span>
        <span className="font-mono text-sm font-semibold text-zinc-900">{signal.symbol}</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500">Entry</dt>
          <dd className="font-mono text-zinc-900">{signal.entry}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Stop loss</dt>
          <dd className="font-mono text-zinc-900">{signal.stopLoss}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Targets</dt>
          <dd className="font-mono text-zinc-900">{signal.targets.join(" / ")}</dd>
        </div>
      </dl>

      {signal.note && <p className="mt-3 text-sm text-zinc-700">{signal.note}</p>}
    </div>
  );
}
