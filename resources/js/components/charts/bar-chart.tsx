import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Validated two-slot palette (light surface): green, amber. Fixed order, never cycled. */
export const SERIES_COLORS = ['#00896B', '#C77A10'];

export type BarSeries = { key: string; label: string };

type Props = {
    data: Record<string, number | string | null>[];
    xKey: string;
    series: BarSeries[];
    stacked?: boolean;
    height?: number;
    formatValue?: (v: number) => string;
    formatX?: (v: string) => string;
    /** Show every Nth x label (long daily series). */
    labelEvery?: number;
    title: string;
};

/** Accessible bar chart: one y-axis, thin rounded bars, legend, hover tooltip, table view. */
export function BarChart({ data, xKey, series, stacked = false, height = 220, formatValue = (v) => v.toLocaleString(), formatX = (v) => v, labelEvery = 1, title }: Props) {
    const [hover, setHover] = useState<number | null>(null);
    const [asTable, setAsTable] = useState(false);

    const total = (row: Props['data'][number]) => series.reduce((sum, s) => sum + Number(row[s.key] ?? 0), 0);
    const max = Math.max(1, ...data.map((row) => (stacked ? total(row) : Math.max(...series.map((s) => Number(row[s.key] ?? 0))))));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];

    return (
        <figure className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {series.length > 1 &&
                    series.map((s, i) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5 text-muted-ink">
                            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_COLORS[i] }} aria-hidden />
                            {s.label}
                        </span>
                    ))}
                <button type="button" onClick={() => setAsTable((v) => !v)} className="ml-auto text-xs font-bold text-forest hover:underline">
                    {asTable ? 'View as chart' : 'View as table'}
                </button>
            </div>

            {asTable ? (
                <div className="max-h-[260px] overflow-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                        <caption className="sr-only">{title}</caption>
                        <thead className="sticky top-0 bg-paper">
                            <tr className="text-left text-xs text-muted-ink">
                                <th className="px-3 py-2 font-bold">{xKey === 'date' ? 'Date' : 'Period'}</th>
                                {series.map((s) => <th key={s.key} className="px-3 py-2 text-right font-bold">{s.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-t border-[#F1F0EC]">
                                    <td className="px-3 py-1.5">{formatX(String(row[xKey]))}</td>
                                    {series.map((s) => <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">{formatValue(Number(row[s.key] ?? 0))}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="relative mt-2 flex gap-2" style={{ height }} role="img" aria-label={title}>
                    {/* y-axis */}
                    <div className="relative w-10 shrink-0 text-right text-[11px] text-muted-ink tabular-nums">
                        {ticks.map((t) => (
                            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{compact(t)}</span>
                        ))}
                    </div>
                    <div className="relative flex-1">
                        {ticks.map((t) => (
                            <div key={t} className={cn('absolute inset-x-0 border-t', t === 0 ? 'border-line-strong' : 'border-dashed border-[#EEECE7]')} style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
                        ))}
                        <div className="absolute inset-0 flex items-end" onMouseLeave={() => setHover(null)}>
                            {data.map((row, i) => (
                                <div
                                    key={i}
                                    className="group relative flex h-full flex-1 items-end justify-center gap-[2px] px-[1px]"
                                    onMouseEnter={() => setHover(i)}
                                    onFocus={() => setHover(i)}
                                    tabIndex={0}
                                    aria-label={`${formatX(String(row[xKey]))}: ${series.map((s) => `${s.label} ${formatValue(Number(row[s.key] ?? 0))}`).join(', ')}`}
                                >
                                    {hover === i && <div className="absolute inset-y-0 -inset-x-px rounded bg-ink/[0.04]" aria-hidden />}
                                    {stacked ? (
                                        <div className="flex w-full max-w-7 flex-col-reverse gap-[2px]" style={{ height: `${(total(row) / top) * 100}%` }}>
                                            {series.map((s, si) => {
                                                const v = Number(row[s.key] ?? 0);
                                                return v > 0 ? <div key={s.key} className={cn(si === series.length - 1 || series.slice(si + 1).every((n) => !Number(row[n.key])) ? 'rounded-t' : '')} style={{ flexGrow: v, backgroundColor: SERIES_COLORS[si] }} /> : null;
                                            })}
                                        </div>
                                    ) : (
                                        series.map((s, si) => (
                                            <div key={s.key} className="w-full max-w-3 rounded-t" style={{ height: `${(Number(row[s.key] ?? 0) / top) * 100}%`, backgroundColor: SERIES_COLORS[si], minHeight: Number(row[s.key]) > 0 ? 2 : 0 }} />
                                        ))
                                    )}
                                    {hover === i && (
                                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 min-w-32 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
                                            <div className="mb-1 font-bold">{formatX(String(row[xKey]))}</div>
                                            {series.map((s, si) => (
                                                <div key={s.key} className="flex items-center gap-2">
                                                    <span className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[si] }} />
                                                    <span className="text-white/80">{s.label}</span>
                                                    <span className="ml-auto font-bold tabular-nums">{formatValue(Number(row[s.key] ?? 0))}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {!asTable && (
                <div className="ml-12 flex text-[11px] text-muted-ink" aria-hidden>
                    {data.map((row, i) => (
                        <span key={i} className="flex w-0 flex-1 justify-center overflow-visible whitespace-nowrap">{i % labelEvery === 0 ? formatX(String(row[xKey])) : ''}</span>
                    ))}
                </div>
            )}
            <figcaption className="sr-only">{title}</figcaption>
        </figure>
    );
}

/** Horizontal ranked bars (single series) with the value as a direct label. */
export function RankedBars({ rows, formatValue = (v) => v.toLocaleString(), empty }: { rows: { label: string; value: number; hint?: string; image?: string | null }[]; formatValue?: (v: number) => string; empty: string }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-ink">{empty}</p>;

    return (
        <ol className="flex flex-col gap-2.5">
            {rows.map((r, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                    {r.image !== undefined && (
                        <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-[#E9C79A]">{r.image && <img src={r.image} alt="" className="size-full object-cover" />}</span>
                    )}
                    <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                            <span className="truncate font-semibold">{r.label}</span>
                            {r.hint && <span className="truncate text-xs text-muted-ink">{r.hint}</span>}
                            <span className="ml-auto font-bold tabular-nums">{formatValue(r.value)}</span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#F1F0EC]">
                            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: SERIES_COLORS[0] }} />
                        </span>
                    </span>
                </li>
            ))}
        </ol>
    );
}

function niceTicks(max: number): number[] {
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    const ticks = [];
    for (let v = 0; v <= max + step * 0.001 || ticks.length < 2; v += step) ticks.push(Number(v.toFixed(6)));
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
}

function compact(v: number): string {
    return v >= 1000 ? `${Number((v / 1000).toFixed(1))}k` : String(Number(v.toFixed(2)));
}
