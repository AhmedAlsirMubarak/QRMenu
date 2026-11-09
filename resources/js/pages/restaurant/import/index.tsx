import { Head, Link, useForm } from '@inertiajs/react';
import { Download, FileSpreadsheet, Lock, Upload } from 'lucide-react';
import type { FormEvent } from 'react';
import { Btn } from '@/components/platform/fields';
import { IMPORT_MODES as MODES } from '@/lib/import-modes';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';

type Batch = {
    id: number;
    filename: string;
    mode: 'add' | 'update' | 'upsert';
    status: 'uploaded' | 'previewed' | 'completed' | 'failed';
    total_rows: number;
    created_count: number;
    updated_count: number;
    failed_count: number;
    created_at: string;
    user: { id: number; name: string } | null;
};


const STATUS: Record<Batch['status'], { label: string; cls: string }> = {
    uploaded: { label: 'Not finished', cls: 'bg-[#F1F0EC] text-muted-ink' },
    previewed: { label: 'Waiting to run', cls: 'bg-saffron-soft text-ink' },
    completed: { label: 'Completed', cls: 'bg-forest-soft text-forest' },
    failed: { label: 'Failed', cls: 'bg-clay-soft text-clay' },
};

export default function ImportIndex({ batches, canImport, itemCount }: { batches: Batch[]; canImport: boolean; itemCount: number }) {
    const { data, setData, post, processing, errors } = useForm<{ file: File | null; mode: Batch['mode'] }>({
        file: null,
        mode: itemCount > 0 ? 'upsert' : 'add',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/app/menu/import', { forceFormData: true });
    };

    return (
        <>
            <Head title="Import & export" />
            <PageHeader title="Import & export" description="Bring your whole menu in from Excel or CSV, or download it as a backup." />

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-1 text-lg font-extrabold">Import dishes</h2>
                    <p className="mb-4 text-sm text-muted-ink">Arabic and English are both fine. Nothing is deleted by an import — and you’ll see a preview before anything changes.</p>

                    {!canImport ? (
                        <div className="flex items-start gap-3 rounded-2xl bg-saffron-soft p-4">
                            <Lock className="mt-0.5 size-5 shrink-0" />
                            <div>
                                <div className="font-bold">Excel/CSV import is on the Professional and Business plans.</div>
                                <div className="text-sm text-muted-ink">You can still export your menu below.</div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="flex flex-col gap-4">
                            <ol className="flex flex-col gap-1 text-sm">
                                <li><b>1.</b> Download the template (or use your own sheet — you’ll match the columns next).</li>
                                <li><b>2.</b> Fill in one dish per row.</li>
                                <li><b>3.</b> Upload it here and check the preview.</li>
                            </ol>

                            <label
                                className={cn(
                                    'relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center',
                                    data.file ? 'border-forest bg-forest-soft' : 'border-line-strong bg-paper hover:border-ink',
                                )}
                            >
                                <FileSpreadsheet className="size-8 text-forest" />
                                <span className="font-bold">{data.file ? data.file.name : 'Choose a .xlsx or .csv file'}</span>
                                <span className="text-sm text-muted-ink">{data.file ? `${(data.file.size / 1024).toFixed(0)} KB` : 'Up to 5 MB · 2,000 dishes'}</span>
                                <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setData('file', e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0" aria-label="Spreadsheet file" />
                            </label>
                            {errors.file && <p className="text-sm font-semibold text-clay">{errors.file}</p>}

                            <fieldset className="grid gap-2 sm:grid-cols-3">
                                <legend className="mb-2 text-[13px] font-bold">What should the import do?</legend>
                                {(Object.keys(MODES) as Batch['mode'][]).map((mode) => (
                                    <label key={mode} className={cn('cursor-pointer rounded-2xl border p-3.5', data.mode === mode ? 'border-2 border-forest bg-forest-soft' : 'border-line')}>
                                        <input type="radio" name="mode" value={mode} checked={data.mode === mode} onChange={() => setData('mode', mode)} className="sr-only" />
                                        <span className="block text-sm font-bold">{MODES[mode].title}</span>
                                        <span className="mt-1 block text-xs text-muted-ink">{MODES[mode].text}</span>
                                    </label>
                                ))}
                            </fieldset>

                            <Btn type="submit" variant="forest" className="h-12 self-start px-6" disabled={!data.file || processing}>
                                <Upload className="size-4" /> {processing ? 'Reading file…' : 'Upload & continue'}
                            </Btn>
                        </form>
                    )}
                </section>

                <aside className="flex flex-col gap-4">
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-1 font-extrabold">Template</h2>
                        <p className="mb-3 text-sm text-muted-ink">Columns for each of your menu languages, with two example dishes.</p>
                        <div className="flex gap-2">
                            <a href="/app/menu/import/template?format=xlsx" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-bold text-white"><Download className="size-4" /> Excel</a>
                            <a href="/app/menu/import/template?format=csv" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong text-sm font-bold"><Download className="size-4" /> CSV</a>
                        </div>
                    </section>
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-1 font-extrabold">Export your menu</h2>
                        <p className="mb-3 text-sm text-muted-ink">{itemCount} dishes. Edit the file and import it back with “Add &amp; update”.</p>
                        <div className="flex gap-2">
                            <a href="/app/menu/export?format=xlsx" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong text-sm font-bold"><Download className="size-4" /> Excel</a>
                            <a href="/app/menu/export?format=csv" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong text-sm font-bold"><Download className="size-4" /> CSV</a>
                        </div>
                    </section>
                </aside>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
                <h2 className="border-b border-line px-5 py-4 font-bold">Import history</h2>
                <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted-ink">
                                <th className="px-5 py-2.5 font-bold">FILE</th>
                                <th className="px-3 py-2.5 font-bold">MODE</th>
                                <th className="px-3 py-2.5 font-bold">RESULT</th>
                                <th className="px-3 py-2.5 font-bold">STATUS</th>
                                <th className="px-3 py-2.5 font-bold">BY</th>
                                <th className="px-5 py-2.5"><span className="sr-only">Open</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-ink">No imports yet.</td></tr>}
                            {batches.map((b) => (
                                <tr key={b.id} className="border-t border-[#F1F0EC]">
                                    <td className="px-5 py-3"><div className="font-bold">{b.filename}</div><div className="text-xs text-muted-ink">{new Date(b.created_at).toLocaleString()}</div></td>
                                    <td className="px-3 py-3">{MODES[b.mode].title}</td>
                                    <td className="px-3 py-3">
                                        {b.status === 'completed' ? `${b.created_count} added · ${b.updated_count} updated${b.failed_count ? ` · ${b.failed_count} skipped` : ''}` : `${b.total_rows} rows`}
                                    </td>
                                    <td className="px-3 py-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', STATUS[b.status].cls)}>{STATUS[b.status].label}</span></td>
                                    <td className="px-3 py-3 text-muted-ink">{b.user?.name ?? '—'}</td>
                                    <td className="px-5 py-3 text-right"><Link href={`/app/menu/import/${b.id}`} className="font-bold text-forest">Open →</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}
