import React from 'react';

type SalesProgressProps = { sold: number; total: number };

export function SalesProgress({ sold, total }: SalesProgressProps) {
  const raw = total > 0 ? Math.round((sold / total) * 100) : 0;
  const pct = Math.min(100, Math.max(1, raw)); // mínimo 1% como requisito
  return (
    <div className="w-full space-y-2" role="group" aria-label="Progreso de ventas">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Progreso de ventas</p>
        <p className="text-sm tabular-nums" aria-live="polite">{pct}%</p>
      </div>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progreso de ventas"
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, var(--brand), var(--accent))",
            boxShadow: "0 0 12px rgba(0,0,0,.08), 0 0 24px var(--accent)"
          }}
        />
        {[25,50,75,100].map(m => (
          <span
            key={m}
            aria-hidden
            className="absolute top-0 h-full w-px bg-white/40 dark:bg-white/20"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Vendidos <span className="tabular-nums">{sold}</span> / <span className="tabular-nums">{total}</span>
      </p>
    </div>
  );
}
