import { Head, Link, router, useForm } from '@inertiajs/react';
import { BellRing, Check, MessageSquareText, Star } from 'lucide-react';
import type { FormEvent } from 'react';
import { BarChart } from '@/components/charts/bar-chart';
import { Btn, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

type Feedback = {
    id: number;
    overall_rating: number;
    food_rating: number | null;
    service_rating: number | null;
    cleanliness_rating: number | null;
    comment: string | null;
    is_anonymous: boolean;
    contact: string | null;
    locale: string | null;
    created_at: string;
    resolved_at: string | null;
    alert_sent_at: string | null;
    branch: { id: number; name: string } | null;
    qr_code: { id: number; table_label: string | null } | null;
};

type Props = {
    filters: { period: string; branch: number | null; rating: string | null; status: string | null };
    branches: { id: number; name: string }[];
    summary: { total: number; overall: number | null; food: number | null; service: number | null; cleanliness: number | null; counts: { food: number; service: number; cleanliness: number }; distribution: { stars: number; total: number }[]; open_low: number };
    trend: { month: string; average: number | null; count: number }[];
    feedback: Paginated<Feedback>;
    alerts: { threshold: number; email: string | null; owner_emails: string[] };
    canManage: boolean;
    highlight: number | null;
};

const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(1));

const ratingCount = (n: number) => (n === 1 ? '1 rating' : `${n} ratings`);

export default function FeedbackIndex({ filters, branches, summary, trend, feedback, alerts, canManage, highlight }: Props) {
    const apply = (next: Partial<Props['filters']>) =>
        router.get('/app/feedback', Object.fromEntries(Object.entries({ ...filters, ...next }).filter(([, v]) => v !== null && v !== '')), { preserveState: true, preserveScroll: true, replace: true });

    const resolve = (f: Feedback) => router.patch(`/app/feedback/${f.id}`, { resolved: !f.resolved_at }, { preserveScroll: true, preserveState: true });
    const maxDist = Math.max(1, ...summary.distribution.map((d) => d.total));

    return (
        <>
            <Head title="Feedback" />
            <PageHeader
                title="Customer feedback"
                description="Private ratings from guests — separate from your public Google reviews."
                actions={
                    <>
                        {branches.length > 1 && (
                            <SelectInput aria-label="Branch" value={filters.branch ?? ''} onChange={(e) => apply({ branch: e.target.value ? Number(e.target.value) : null })}>
                                <option value="">All branches</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SelectInput>
                        )}
                        <SelectInput aria-label="Period" value={filters.period} onChange={(e) => apply({ period: e.target.value })}>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last 12 months</option>
                        </SelectInput>
                    </>
                }
            />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <StatCard tone="dark" label="OVERALL" value={<span>{fmt(summary.overall)} <span className="text-lg text-[#F2B33D]">★</span></span>} hint={`${summary.total} responses`} />
                <StatCard label="FOOD" value={fmt(summary.food)} hint={ratingCount(summary.counts.food)} />
                <StatCard label="SERVICE" value={fmt(summary.service)} hint={ratingCount(summary.counts.service)} />
                <StatCard label="CLEANLINESS" value={fmt(summary.cleanliness)} hint={ratingCount(summary.counts.cleanliness)} />
                <StatCard tone={summary.open_low ? 'warn' : 'plain'} label="LOW RATINGS TO FOLLOW UP" value={summary.open_low} hint={summary.open_low ? 'Overall 1–2 stars, not resolved' : 'All handled'} />
            </div>

            <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_320px]">
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-3 font-bold">Average overall rating by month</h2>
                    <BarChart
                        title="Average overall rating by month"
                        data={trend.map((t) => ({ month: t.month, average: t.average ?? 0 }))}
                        xKey="month"
                        series={[{ key: 'average', label: 'Average rating' }]}
                        formatValue={(v) => (v ? `${v.toFixed(1)} / 5` : 'No feedback')}
                        height={180}
                    />
                </section>
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-3 font-bold">Rating distribution</h2>
                    <ul className="flex flex-col gap-2">
                        {summary.distribution.map((d) => (
                            <li key={d.stars}>
                                <button type="button" onClick={() => apply({ rating: d.stars <= 2 ? 'low' : d.stars >= 4 ? 'high' : null })} className="flex w-full items-center gap-2 text-sm">
                                    <span className="w-8 text-right font-bold tabular-nums">{d.stars} ★</span>
                                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F0EC]"><span className="block h-full rounded-full bg-[#00896B]" style={{ width: `${(d.total / maxDist) * 100}%` }} /></span>
                                    <span className="w-8 text-right tabular-nums text-muted-ink">{d.total}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
                <section className="min-w-0 rounded-2xl border border-line bg-white">
                    <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                        <h2 className="font-bold">Responses</h2>
                        <div className="ml-auto flex flex-wrap gap-1.5">
                            {[
                                { label: 'All', rating: null, status: null },
                                { label: 'Low (1–2★)', rating: 'low', status: null },
                                { label: 'To follow up', rating: 'low', status: 'open' },
                                { label: 'Positive (4–5★)', rating: 'high', status: null },
                            ].map((f) => {
                                const active = filters.rating === f.rating && filters.status === f.status;
                                return (
                                    <button key={f.label} type="button" onClick={() => apply({ rating: f.rating, status: f.status })} aria-pressed={active} className={cn('h-9 rounded-full px-3 text-sm font-bold', active ? 'bg-ink text-white' : 'bg-[#F1F0EC]')}>
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {feedback.data.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-muted-ink">
                            <MessageSquareText className="size-8" />
                            {filters.rating || filters.status || filters.branch
                                ? 'No feedback matches these filters.'
                                : 'No feedback here yet. Guests rate you from the “Rate your experience” button on your menu.'}
                        </div>
                    )}
                    <ul>
                        {feedback.data.map((f) => (
                            <li key={f.id} className={cn('border-t border-[#F1F0EC] px-5 py-4 first:border-t-0', highlight === f.id && 'bg-saffron-soft', f.overall_rating <= 2 && !f.resolved_at && 'border-l-4 border-l-clay')}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="flex" aria-label={`${f.overall_rating} out of 5`}>
                                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('size-4', n <= f.overall_rating ? 'fill-[#F2B33D] text-[#C98A12]' : 'text-line-strong')} aria-hidden />)}
                                    </span>
                                    <span className="text-sm text-muted-ink">
                                        {new Date(f.created_at).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        {f.branch && branches.length > 1 && ` · ${f.branch.name}`}
                                        {f.qr_code?.table_label && ` · ${f.qr_code.table_label}`}
                                        {f.locale === 'ar' && ' · Arabic'}
                                    </span>
                                    {f.alert_sent_at && <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 text-[11px] font-bold text-clay"><BellRing className="size-3" />Alert emailed</span>}
                                    <button type="button" onClick={() => resolve(f)} className={cn('ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold', f.resolved_at ? 'bg-forest-soft text-forest' : 'border border-line-strong')}>
                                        {f.resolved_at ? <><Check className="size-4" />Resolved</> : 'Mark resolved'}
                                    </button>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-ink">
                                    {f.food_rating && <span>Food {f.food_rating}/5</span>}
                                    {f.service_rating && <span>Service {f.service_rating}/5</span>}
                                    {f.cleanliness_rating && <span>Cleanliness {f.cleanliness_rating}/5</span>}
                                </div>
                                {f.comment && <p className="mt-2 whitespace-pre-line text-[15px]" dir="auto">{f.comment}</p>}
                                {!f.is_anonymous && f.contact && <p className="mt-1.5 text-sm font-semibold">Contact: <span dir="ltr">{f.contact}</span></p>}
                            </li>
                        ))}
                    </ul>
                    {feedback.last_page > 1 && (
                        <nav aria-label="Pagination" className="flex flex-wrap gap-1 border-t border-line px-5 py-3">
                            {feedback.links.map((l, i) =>
                                l.url ? (
                                    <Link key={i} href={l.url} preserveScroll className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', l.active ? 'bg-ink text-white' : 'bg-paper')}>
                                        {l.label.replace(/&laquo;|&raquo;/g, '').trim()}
                                    </Link>
                                ) : null,
                            )}
                        </nav>
                    )}
                </section>

                {canManage && <AlertSettings alerts={alerts} />}
            </div>
        </>
    );
}

function AlertSettings({ alerts }: { alerts: Props['alerts'] }) {
    const form = useForm({ threshold: String(alerts.threshold), email: alerts.email ?? '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/app/feedback/alerts', { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex h-fit flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-2">
                <BellRing className="size-5 text-clay" />
                <h2 className="font-bold">Instant low-rating alerts</h2>
            </div>
            <p className="text-sm text-muted-ink">Hear about an unhappy guest while they’re still at the table — and put it right before it becomes a public review.</p>
            <Field label="Alert when any rating is" error={form.errors.threshold}>
                <SelectInput value={form.data.threshold} onChange={(e) => form.setData('threshold', e.target.value)}>
                    <option value="0">Off</option>
                    <option value="1">1 star</option>
                    <option value="2">2 stars or lower</option>
                    <option value="3">3 stars or lower</option>
                </SelectInput>
            </Field>
            <Field label="Send alerts to" error={form.errors.email}>
                <TextInput type="email" placeholder={alerts.owner_emails[0] ?? 'manager@restaurant.com'} value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                {!form.data.email && alerts.owner_emails.length > 0 && <span className="text-xs font-medium text-muted-ink">Empty = the owner ({alerts.owner_emails.join(', ')}).</span>}
            </Field>
            <Btn type="submit" variant="forest" disabled={form.processing || !form.isDirty}>Save alerts</Btn>
        </form>
    );
}

