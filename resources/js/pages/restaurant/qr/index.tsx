import { Head, router, useForm } from '@inertiajs/react';
import { Check, Copy, Download, Lock, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { downloadPng, downloadSvg, fileSafe } from '@/components/qr/qr';
import type { QrStyle } from '@/components/qr/qr';
import { QrImage } from '@/components/qr/qr-image';
import { Btn, CheckRow, Field, TextInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';

type Qr = { id: number; code: string; table_label: string | null; scans_count: number };
type Branch = { id: number; name: string; slug: string; is_active: boolean; qr_codes: Qr[] };

type Props = {
    branches: Branch[];
    qrBaseUrl: string;
    menuUrl: string;
    qrRestaurant: { name: string; logo_url: string | null; theme: string };
    canUseTables: boolean;
};

const COLORS = [
    { name: 'Ink', dark: '#14110F' },
    { name: 'Forest', dark: '#0E4D3F' },
    { name: 'Navy', dark: '#1E3A5F' },
    { name: 'Maroon', dark: '#6B1D2A' },
];

export default function QrCodes({ branches, qrBaseUrl, menuUrl, qrRestaurant: restaurant, canUseTables }: Props) {
    const [dark, setDark] = useState(COLORS[0].dark);
    const [withLogo, setWithLogo] = useState(Boolean(restaurant.logo_url));
    const [addFor, setAddFor] = useState<Branch | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const style: QrStyle = { dark, light: '#FFFFFF', logoUrl: withLogo ? restaurant.logo_url : null };

    const urlFor = (qr: Qr) => `${qrBaseUrl}/${qr.code}`;
    const nameFor = (b: Branch, qr: Qr) => fileSafe(`${restaurant.name}-${b.name}-${qr.table_label ?? 'menu'}`);

    const copy = async (text: string) => {
        if (!(await copyText(text))) {
            toast.error('Couldn’t copy — select the link and copy it yourself.');
            return;
        }
        toast.success('Link copied');
        setCopied(text);
        setTimeout(() => setCopied(null), 1500);
    };

    const rename = (qr: Qr) => {
        const label = window.prompt('Table name', qr.table_label ?? '');
        if (label && label !== qr.table_label) router.put(`/app/qr/${qr.id}`, { table_label: label }, { preserveScroll: true });
    };

    const remove = (qr: Qr) => {
        if (window.confirm(`Delete the QR code for ${qr.table_label}? Printed copies will stop working.`)) {
            router.delete(`/app/qr/${qr.id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="QR codes" />
            <PageHeader
                title="QR codes"
                description="Codes never change — update your menu any time without reprinting."
                actions={
                    <a href="/app/qr/print" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white">
                        <Printer className="size-4" /> Print table cards
                    </a>
                }
            />

            <section aria-label="QR style" className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-white px-4 py-3.5">
                <div className="flex items-center gap-2 text-sm font-bold">
                    Colour
                    {COLORS.map((c) => (
                        <button
                            key={c.dark}
                            type="button"
                            onClick={() => setDark(c.dark)}
                            aria-label={c.name}
                            aria-pressed={dark === c.dark}
                            className={cn('size-8 rounded-full border-2', dark === c.dark ? 'border-saffron ring-2 ring-ink' : 'border-white ring-1 ring-line-strong')}
                            style={{ backgroundColor: c.dark }}
                        />
                    ))}
                </div>
                {restaurant.logo_url ? (
                    <CheckRow checked={withLogo} onChange={setWithLogo}>Logo in the middle</CheckRow>
                ) : (
                    <span className="text-sm text-muted-ink">Upload a logo in Profile to add it to your QR codes.</span>
                )}
                <div className="flex min-w-0 items-center gap-2 text-sm sm:ml-auto">
                    <span className="truncate text-muted-ink">{menuUrl}</span>
                    <button type="button" onClick={() => void copy(menuUrl)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong px-2.5 font-bold">
                        {copied === menuUrl ? <Check className="size-4" /> : <Copy className="size-4" />} Link
                    </button>
                </div>
            </section>

            <div className="flex flex-col gap-6">
                {branches.map((branch) => {
                    const main = branch.qr_codes.find((q) => q.table_label === null);
                    const tables = branch.qr_codes.filter((q) => q.table_label !== null);

                    return (
                        <section key={branch.id} aria-label={branch.name} className="rounded-2xl border border-line bg-white p-5">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-extrabold">{branch.name}</h2>
                                {!branch.is_active && <span className="rounded-full bg-[#F1F0EC] px-2 py-0.5 text-[11px] font-bold text-muted-ink">Hidden</span>}
                                <span className="ml-auto flex gap-2">
                                    <a href={`/app/qr/print?branch=${branch.id}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-bold">
                                        <Printer className="size-4" /> Print branch
                                    </a>
                                    <Btn variant="outline" className="h-10" onClick={() => setAddFor(branch)} disabled={!canUseTables} title={canUseTables ? undefined : 'Table QR codes are on Professional and Business'}>
                                        {canUseTables ? <Plus className="size-4" /> : <Lock className="size-4" />} Add tables
                                    </Btn>
                                </span>
                            </div>

                            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                                {[main, ...tables].filter((q): q is Qr => Boolean(q)).map((qr) => (
                                    <article key={qr.id} className={cn('flex flex-col gap-2 rounded-2xl border p-3', qr.table_label ? 'border-line' : 'border-2 border-forest')}>
                                        <QrImage value={urlFor(qr)} style={style} label={`QR code for ${qr.table_label ?? branch.name}`} className="rounded-lg" />
                                        <div className="flex items-center gap-1">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold">{qr.table_label ?? 'Whole branch'}</span>
                                                <span className="block text-xs text-muted-ink">{qr.scans_count.toLocaleString()} scans</span>
                                            </span>
                                            {qr.table_label && (
                                                <>
                                                    <button type="button" onClick={() => rename(qr)} className="grid size-8 place-items-center rounded-lg text-muted-ink hover:bg-paper" aria-label={`Rename ${qr.table_label}`}><Pencil className="size-3.5" /></button>
                                                    <button type="button" onClick={() => remove(qr)} className="grid size-8 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label={`Delete ${qr.table_label}`}><Trash2 className="size-3.5" /></button>
                                                </>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <button type="button" onClick={() => void downloadPng(urlFor(qr), style, `${nameFor(branch, qr)}.png`)} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-ink text-xs font-bold text-white"><Download className="size-3.5" />PNG</button>
                                            <button type="button" onClick={() => void downloadSvg(urlFor(qr), style, `${nameFor(branch, qr)}.svg`)} className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong text-xs font-bold">SVG</button>
                                            <button type="button" onClick={() => void copy(urlFor(qr))} className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong text-xs font-bold" aria-label="Copy link">
                                                {copied === urlFor(qr) ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            {tables.length === 0 && canUseTables && (
                                <p className="mt-3 text-sm text-muted-ink">Tip: give each table its own code to see which tables scan most and which table feedback came from.</p>
                            )}
                        </section>
                    );
                })}
            </div>

            <Dialog open={addFor !== null} onOpenChange={(o) => !o && setAddFor(null)}>
                <DialogContent className="bg-white sm:max-w-md">
                    {addFor && <AddTables branch={addFor} onDone={() => setAddFor(null)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

function AddTables({ branch, onDone }: { branch: Branch; onDone: () => void }) {
    const next = branch.qr_codes.filter((q) => q.table_label).length + 1;
    const form = useForm({ branch_id: branch.id, prefix: 'Table', from: String(next), to: String(next + 9) });
    const count = Math.max(0, Number(form.data.to) - Number(form.data.from) + 1);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/app/qr', { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">Add tables · {branch.name}</DialogTitle>
                <DialogDescription>Each table gets its own permanent QR code.</DialogDescription>
            </DialogHeader>
            <Field label="Name" error={form.errors.prefix}>
                <TextInput value={form.data.prefix} onChange={(e) => form.setData('prefix', e.target.value)} placeholder="Table" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="From number" error={form.errors.from}>
                    <TextInput inputMode="numeric" value={form.data.from} onChange={(e) => form.setData('from', e.target.value)} />
                </Field>
                <Field label="To number" error={form.errors.to}>
                    <TextInput inputMode="numeric" value={form.data.to} onChange={(e) => form.setData('to', e.target.value)} />
                </Field>
            </div>
            <p className="text-sm text-muted-ink">
                {count === 0 ? (
                    <span className="text-clay">“To number” must be the same as or higher than “From number”.</span>
                ) : (
                    <>
                Creates {count} code{count === 1 ? '' : 's'}: “{form.data.prefix} {String(form.data.from).padStart(2, '0')}” … “{form.data.prefix} {String(form.data.to).padStart(2, '0')}”. Existing tables are skipped.
                    </>
                )}
            </p>
            <div className="flex gap-2">
                <Btn variant="outline" onClick={onDone}>Cancel</Btn>
                <Btn type="submit" variant="forest" className="flex-1" disabled={form.processing || count < 1 || count > 200}>Create {count} QR codes</Btn>
            </div>
        </form>
    );
}
