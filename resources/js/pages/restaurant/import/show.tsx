import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FolderPlus, PencilLine, PlusCircle, XCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Btn, SelectInput } from '@/components/platform/fields';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { plural } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { IMPORT_MODES as MODES } from '@/lib/import-modes';

type Mode = 'add' | 'update' | 'upsert';
type PreviewRow = { line: number; action: 'create' | 'update' | 'error'; name: string | null; category: string | null; price: string | null; errors: string[]; warnings: string[] };

type Props = {
    batch: {
        id: number;
        filename: string;
        mode: Mode;
        status: 'uploaded' | 'previewed' | 'completed' | 'failed';
        total_rows: number;
        created_count: number;
        updated_count: number;
        failed_count: number;
        column_map: Record<string, number> | null;
        headers: string[] | null;
        summary: { total: number; create: number; update: number; error: number; warnings: number; new_categories: string[]; preview: PreviewRow[] } | null;
        completed_at: string | null;
    };
    fields: Record<string, string>;
    required: string[];
    sampleRows: string[][];
};

const ACTION = {
    create: { label: 'New', cls: 'bg-forest-soft text-forest', icon: PlusCircle },
    update: { label: 'Update', cls: 'bg-saffron-soft text-ink', icon: PencilLine },
    error: { label: 'Skipped', cls: 'bg-clay-soft text-clay', icon: XCircle },
} as const;

export default function ImportShow({ batch, fields, required, sampleRows }: Props) {
    const headers = batch.headers ?? [];
    const done = batch.status === 'completed';
    const [filter, setFilter] = useState<'all' | 'error'>('all');

    const form = useForm<{ mode: Mode; map: Record<string, number | ''> }>({
        mode: batch.mode,
        map: Object.fromEntries(Object.keys(fields).map((f) => [f, batch.column_map?.[f] ?? ''])),
    });

    const missingRequired = form.data.mode !== 'update' ? required.filter((f) => form.data.map[f] === '') : [];
    const sample = (index: number) => sampleRows.map((r) => r[index]).filter(Boolean).slice(0, 2).join(' · ');

    const check = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, map: Object.fromEntries(Object.entries(d.map).filter(([, v]) => v !== '')) }));
        form.post(`/app/menu/import/${batch.id}/preview`, { preserveScroll: true });
    };

    const run = () => {
        const s = batch.summary;
        if (!s) return;
        if (!window.confirm(`Add ${s.create} and update ${s.update} dish(es)?${s.error ? ` ${s.error} row(s) with errors will be skipped.` : ''}`)) return;
        router.post(`/app/menu/import/${batch.id}/run`, {}, { preserveScroll: true });
    };

    const rows = (batch.summary?.preview ?? []).filter((r) => filter === 'all' || r.action === 'error');
    const stale = form.isDirty; // mapping changed since the last check

    return (
        <>
            <Head title={`Import · ${batch.filename}`} />
            <Link href="/app/menu/import" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-muted-ink hover:text-ink"><ArrowLeft className="size-4" /> Import & export</Link>
            <PageHeader title={batch.filename} description={done ? `Imported ${new Date(batch.completed_at ?? '').toLocaleString()}` : `${batch.total_rows} rows found`} />

            {done && batch.summary && (
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-forest bg-forest-soft p-5">
                    <CheckCircle2 className="size-8 text-forest" />
                    <div className="flex-1">
                        <div className="text-lg font-extrabold">Import finished</div>
                        <div className="text-sm">{plural(batch.created_count, 'dish', 'dishes')} added · {batch.updated_count} updated{batch.failed_count ? ` · ${plural(batch.failed_count, 'row', 'rows')} skipped` : ''}{batch.summary.new_categories.length ? ` · new categories: ${batch.summary.new_categories.join(', ')}` : ''}</div>
                    </div>
                    {batch.failed_count > 0 && <a href={`/app/menu/import/${batch.id}/errors`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold"><Download className="size-4" /> Skipped rows</a>}
                    <Link href="/app/menu" className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-bold text-white">Open menu</Link>
                </div>
            )}

            {!done && (
                <form onSubmit={check} className="mb-6 rounded-2xl border border-line bg-white p-5">
                    <div className="mb-4 flex flex-wrap items-end gap-4">
                        <div className="flex-1">
                            <h2 className="text-lg font-extrabold">Match your columns</h2>
                            <p className="text-sm text-muted-ink">We matched what we could. Check the ones marked *, then press “Check rows”.</p>
                        </div>
                        <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-ink">
                            MODE
                            <SelectInput value={form.data.mode} onChange={(e) => form.setData('mode', e.target.value as Mode)} className="text-ink">
                                {(Object.keys(MODES) as Mode[]).map((m) => <option key={m} value={m}>{MODES[m].title}</option>)}
                            </SelectInput>
                        </label>
                    </div>

                    <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
                        {Object.entries(fields).map(([field, label]) => {
                            const value = form.data.map[field];
                            const isRequired = required.includes(field) && form.data.mode !== 'update';
                            return (
                                <label key={field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 text-sm">
                                    <span className="font-semibold">{label}{isRequired && <span className="text-clay"> *</span>}</span>
                                    <span className="flex min-w-0 flex-col">
                                        <SelectInput
                                            value={value}
                                            onChange={(e) => form.setData('map', { ...form.data.map, [field]: e.target.value === '' ? '' : Number(e.target.value) })}
                                            className={cn('w-full', isRequired && value === '' && 'border-clay')}
                                        >
                                            <option value="">— Don’t import —</option>
                                            {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                                        </SelectInput>
                                        {value !== '' && sample(value) && <span className="mt-0.5 truncate text-xs text-muted-ink" dir="auto">e.g. {sample(value)}</span>}
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    {form.errors.map && <p className="mt-3 text-sm font-semibold text-clay">{form.errors.map}</p>}
                    {missingRequired.length > 0 && <p className="mt-3 text-sm font-semibold text-clay">Choose a column for: {missingRequired.map((f) => fields[f]).join(', ')}.</p>}

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Btn type="submit" variant="dark" disabled={form.processing || missingRequired.length > 0}>{form.processing ? 'Checking…' : batch.summary ? 'Check rows again' : 'Check rows'}</Btn>
                        {batch.summary && !stale && (
                            <Btn variant="forest" onClick={run} disabled={batch.summary.create + batch.summary.update === 0}>
                                Import {batch.summary.create + batch.summary.update} dishes
                            </Btn>
                        )}
                        {stale && batch.summary && <span className="self-center text-sm font-semibold text-muted-ink">Settings changed — check rows again before importing.</span>}
                    </div>
                </form>
            )}

            {batch.summary && (
                <>
                    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                        <StatCard label={done ? 'ADDED' : 'WILL BE ADDED'} value={done ? batch.created_count : batch.summary.create} />
                        <StatCard label={done ? 'UPDATED' : 'WILL BE UPDATED'} value={done ? batch.updated_count : batch.summary.update} />
                        <StatCard tone={batch.summary.error ? 'warn' : 'plain'} label="ROWS WITH ERRORS" value={batch.summary.error} hint={batch.summary.error ? 'These are skipped' : 'All good'} />
                        <StatCard label="NEW CATEGORIES" value={batch.summary.new_categories.length} hint={batch.summary.new_categories.slice(0, 3).join(', ') || undefined} />
                    </div>

                    <section className="overflow-hidden rounded-2xl border border-line bg-white">
                        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                            <h2 className="font-bold">Rows</h2>
                            {batch.summary.warnings > 0 && <span className="inline-flex items-center gap-1 text-sm text-muted-ink"><AlertTriangle className="size-4 text-[#C98A12]" />{batch.summary.warnings} with notes</span>}
                            <span className="ml-auto flex gap-2">
                                <span className="inline-flex rounded-xl bg-[#F1F0EC] p-1">
                                    {(['all', 'error'] as const).map((f) => (
                                        <button key={f} type="button" onClick={() => setFilter(f)} className={cn('h-8 rounded-lg px-3 text-sm font-bold', filter === f ? 'bg-white shadow-sm' : 'text-muted-ink')}>
                                            {f === 'all' ? 'All' : `Errors (${batch.summary?.error ?? 0})`}
                                        </button>
                                    ))}
                                </span>
                                {batch.summary.error > 0 && <a href={`/app/menu/import/${batch.id}/errors`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-bold"><Download className="size-4" /> Error report</a>}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted-ink">
                                        <th className="px-5 py-2.5 font-bold">ROW</th>
                                        <th className="px-3 py-2.5 font-bold">RESULT</th>
                                        <th className="px-3 py-2.5 font-bold">DISH</th>
                                        <th className="px-3 py-2.5 font-bold">CATEGORY</th>
                                        <th className="px-3 py-2.5 font-bold">PRICE</th>
                                        <th className="px-3 py-2.5 font-bold">NOTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-ink">No rows with errors.</td></tr>}
                                    {rows.map((r) => {
                                        const a = ACTION[r.action];
                                        const isNewCategory = r.category && batch.summary?.new_categories.includes(r.category);
                                        return (
                                            <tr key={r.line} className={cn('border-t border-[#F1F0EC] align-top', r.action === 'error' && 'bg-clay-soft/50')}>
                                                <td className="px-5 py-2.5 text-muted-ink">{r.line}</td>
                                                <td className="px-3 py-2.5"><span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', a.cls)}><a.icon className="size-3.5" />{a.label}</span></td>
                                                <td className="px-3 py-2.5 font-semibold" dir="auto">{r.name ?? '—'}</td>
                                                <td className="px-3 py-2.5" dir="auto">{r.category ?? '—'}{isNewCategory && <FolderPlus className="ml-1 inline size-3.5 text-forest" aria-label="new category" />}</td>
                                                <td className="px-3 py-2.5">{r.price ?? '—'}</td>
                                                <td className="px-3 py-2.5">
                                                    {r.errors.map((e) => <div key={e} className="font-semibold text-clay">{e}</div>)}
                                                    {r.warnings.map((w) => <div key={w} className="text-muted-ink">{w}</div>)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {(batch.summary.preview.length ?? 0) < batch.summary.total && (
                            <p className="border-t border-line px-5 py-3 text-sm text-muted-ink">Showing the first {batch.summary.preview.length} of {batch.summary.total} rows (errors first).</p>
                        )}
                    </section>
                </>
            )}
        </>
    );
}
