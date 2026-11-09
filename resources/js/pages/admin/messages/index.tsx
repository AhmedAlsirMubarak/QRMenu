import { Head, router } from '@inertiajs/react';
import { Archive, Check, Inbox, Mail, Phone, Reply, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, SelectInput, TextInput } from '@/components/platform/fields';
import { Pager } from '@/components/platform/pager';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

type Message = {
    id: number; topic: string; name: string; email: string; phone: string | null; company: string | null; message: string; locale: string | null;
    status: 'new' | 'read' | 'replied' | 'archived'; admin_notes: string | null; handled_at: string | null; created_at: string; handler: { id: number; name: string } | null;
};
type Props = {
    messages: Paginated<Message>;
    filters: { status?: string; topic?: string; search?: string };
    topics: Record<string, string>;
    counts: Record<'new' | 'read' | 'replied' | 'archived', number>;
    openId: number | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-clay text-white' },
    read: { label: 'Read', cls: 'bg-sand text-ink' },
    replied: { label: 'Replied', cls: 'bg-mint text-forest' },
    archived: { label: 'Archived', cls: 'bg-[#F1F0EC] text-muted-ink' },
};
const when = (d: string) => {
    const date = new Date(d);
    const today = new Date().toDateString() === date.toDateString();
    return today ? date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
};

export default function Messages({ messages, filters, topics, counts, openId }: Props) {
    const [selectedId, setSelectedId] = useState<number | null>(openId ?? messages.data[0]?.id ?? null);
    const [search, setSearch] = useState(filters.search ?? '');
    const selected = messages.data.find((m) => m.id === selectedId) ?? null;
    const apply = (next: Record<string, string>) => router.get('/admin/messages', { ...filters, search, ...next }, { preserveState: true, preserveScroll: true, replace: true });
    const setStatus = (m: Message, status: Message['status']) => router.patch(`/admin/messages/${m.id}`, { status }, { preserveScroll: true, preserveState: true });

    // Opening a new message marks it as read.
    useEffect(() => {
        if (selected?.status === 'new') setStatus(selected, 'read');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    const tabs = [
        { key: '', label: 'Inbox', count: counts.new + counts.read + counts.replied },
        { key: 'new', label: 'New', count: counts.new },
        { key: 'replied', label: 'Replied', count: counts.replied },
        { key: 'archived', label: 'Archived', count: counts.archived },
    ];

    return (
        <>
            <Head title="Messages" />
            <PageHeader title="Messages" description="Everything sent through the website's contact form. New messages are also emailed to the support address in Settings." />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div role="tablist" aria-label="Folders" className="flex flex-wrap gap-1.5">
                    {tabs.map((t) => (
                        <button key={t.key} type="button" role="tab" aria-selected={(filters.status ?? '') === t.key} onClick={() => apply({ status: t.key })} className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold', (filters.status ?? '') === t.key ? 'bg-ink text-white' : 'border border-line-strong bg-white')}>
                            {t.label}
                            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', (filters.status ?? '') === t.key ? 'bg-white/20' : 'bg-sand')}>{t.count}</span>
                        </button>
                    ))}
                </div>
                <SelectInput aria-label="Topic" value={filters.topic ?? ''} onChange={(e) => apply({ topic: e.target.value })} className="ms-auto">
                    <option value="">All topics</option>
                    {Object.entries(topics).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectInput>
                <form role="search" onSubmit={(e: FormEvent) => { e.preventDefault(); apply({}); }} className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-ink" />
                    <TextInput type="search" aria-label="Search messages" placeholder="Search name, email, text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 ps-9" />
                </form>
            </div>

            {messages.data.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-20 text-center text-muted-ink">
                    <Inbox className="size-9" /> No messages here yet.
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
                    <ul className="flex max-h-[calc(100svh-260px)] flex-col overflow-y-auto rounded-2xl border border-line bg-white" aria-label="Messages">
                        {messages.data.map((m) => (
                            <li key={m.id} className="border-b border-line last:border-0">
                                <button type="button" onClick={() => setSelectedId(m.id)} aria-current={m.id === selectedId} className={cn('flex w-full flex-col gap-1 px-4 py-3.5 text-start transition-colors', m.id === selectedId ? 'bg-forest-soft' : 'hover:bg-paper')}>
                                    <span className="flex items-center gap-2">
                                        {m.status === 'new' && <span className="size-2 shrink-0 rounded-full bg-clay" aria-label="New" />}
                                        <span className={cn('min-w-0 flex-1 truncate', m.status === 'new' ? 'font-extrabold' : 'font-bold')}>{m.name}</span>
                                        <span className="shrink-0 text-xs text-muted-ink">{when(m.created_at)}</span>
                                    </span>
                                    <span className="text-xs font-semibold text-forest">{topics[m.topic] ?? m.topic}{m.company ? ` · ${m.company}` : ''}</span>
                                    <span className="line-clamp-2 text-sm text-muted-ink">{m.message}</span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {selected ? <Detail key={selected.id} m={selected} topics={topics} setStatus={setStatus} /> : <div />}
                </div>
            )}
            <Pager page={messages} />
        </>
    );
}

function Detail({ m, topics, setStatus }: { m: Message; topics: Record<string, string>; setStatus: (m: Message, s: Message['status']) => void }) {
    const [notes, setNotes] = useState(m.admin_notes ?? '');
    const subject = encodeURIComponent(`Re: ${topics[m.topic] ?? 'Your message'}`);
    const body = encodeURIComponent(`Hi ${m.name.split(' ')[0]},\n\n\n\n—\nYou wrote:\n${m.message}`);

    return (
        <article className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <header className="flex flex-wrap items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-saffron font-display text-lg font-extrabold">{m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-extrabold">{m.name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"><Mail className="size-4" />{m.email}</a>
                        {m.phone && <a href={`tel:${m.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"><Phone className="size-4" />{m.phone}</a>}
                    </div>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', STATUS[m.status].cls)}>{STATUS[m.status].label}</span>
            </header>

            <dl className="grid gap-3 rounded-xl bg-paper p-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs font-bold text-muted-ink">TOPIC</dt><dd className="font-semibold">{topics[m.topic] ?? m.topic}</dd></div>
                <div><dt className="text-xs font-bold text-muted-ink">BUSINESS</dt><dd className="font-semibold">{m.company || '—'}</dd></div>
                <div><dt className="text-xs font-bold text-muted-ink">RECEIVED</dt><dd className="font-semibold">{new Date(m.created_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}{m.locale === 'ar' ? ' · Arabic' : ''}</dd></div>
            </dl>

            <p dir="auto" className="whitespace-pre-line text-[15px] leading-relaxed">{m.message}</p>

            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <a href={`mailto:${m.email}?subject=${subject}&body=${body}`} onClick={() => m.status !== 'replied' && setStatus(m, 'replied')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white hover:bg-forest-deep">
                    <Reply className="size-4" /> Reply by email
                </a>
                {m.status !== 'replied' && <Btn variant="outline" onClick={() => setStatus(m, 'replied')}><Check className="size-4" /> Mark replied</Btn>}
                {m.status !== 'archived' ? (
                    <Btn variant="outline" onClick={() => setStatus(m, 'archived')}><Archive className="size-4" /> Archive</Btn>
                ) : (
                    <Btn variant="outline" onClick={() => setStatus(m, 'read')}><Inbox className="size-4" /> Move to inbox</Btn>
                )}
                <Btn variant="danger" className="ms-auto" onClick={() => window.confirm(`Delete the message from ${m.name}?`) && router.delete(`/admin/messages/${m.id}`, { preserveScroll: true })}><Trash2 className="size-4" /> Delete</Btn>
            </div>
            {m.handled_at && <p className="-mt-2 text-xs text-muted-ink">Handled {new Date(m.handled_at).toLocaleDateString('en', { dateStyle: 'medium' })}{m.handler ? ` by ${m.handler.name}` : ''}.</p>}

            <form onSubmit={(e) => { e.preventDefault(); router.patch(`/admin/messages/${m.id}`, { admin_notes: notes }, { preserveScroll: true, preserveState: true }); }} className="flex flex-col gap-2">
                <label htmlFor={`notes-${m.id}`} className="text-[13px] font-bold">Internal notes <span className="font-medium text-muted-ink">— only super admins see these</span></label>
                <textarea id={`notes-${m.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-[10px] border border-line-strong px-3 py-2 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20" placeholder="e.g. Sent pricing for 3 branches, follow up Thursday" />
                <Btn type="submit" variant="outline" className="self-start" disabled={notes === (m.admin_notes ?? '')}>Save note</Btn>
            </form>
        </article>
    );
}
