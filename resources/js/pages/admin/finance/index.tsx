import { Head, Link, router, useForm } from '@inertiajs/react';
import { Download, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BarChart, RankedBars } from '@/components/charts/bar-chart';
import { Btn, CheckRow, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Paginated, Translations } from '@/types';

type Payment = {
    id: number;
    invoice_number: string;
    type: string;
    payer_name: string | null;
    description: string | null;
    amount: string;
    currency: string;
    method: string | null;
    status: string;
    display_status: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded';
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
    restaurant: { id: number; name: string; slug: string } | null;
};

type Props = {
    currency: string;
    kpis: {
        revenue_month: number; revenue_change: number | null; mrr: number; active_subscriptions: number; ad_revenue_month: number;
        overdue_amount: number; overdue_count: number; trials_ending: number; new_this_month: number; cancelled_this_month: number;
    };
    revenue: { month: string; subscriptions: number; advertising: number; other: number }[];
    mrrByPlan: { plan: string; count: number; mrr: number }[];
    expiring: { restaurant_id: number; restaurant: string | null; plan: string | null; status: string; date: string | null }[];
    payments: Paginated<Payment>;
    upgradeRequests: { id: number; restaurant_id: number; restaurant: string | null; plan: string | null; billing_cycle: string; message: string | null; by: string | null; created_at: string }[];
    filters: { search?: string; status?: string; type?: string };
    options: {
        methods: Record<string, string>;
        types: Record<string, string>;
        statuses: string[];
        restaurants: { id: number; name: string }[];
        plans: { id: number; name: Translations; price_monthly: string; price_yearly: string | null; currency: string }[];
    };
};

const STATUS_STYLE: Record<Payment['display_status'], string> = {
    paid: 'bg-forest-soft text-forest',
    pending: 'bg-[#F1F0EC] text-muted-ink',
    overdue: 'bg-clay-soft text-clay',
    failed: 'bg-clay-soft text-clay',
    refunded: 'bg-[#F1F0EC] text-muted-ink',
};

export default function Finance({ currency, kpis, revenue, mrrByPlan, expiring, payments, upgradeRequests, filters, options }: Props) {
    const [recording, setRecording] = useState<number | null | 'new'>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const money = (v: number | string) => formatMoney(v, currency);
    const apply = (next: Record<string, string>) => router.get('/admin/finance', { ...filters, search, ...next }, { preserveState: true, preserveScroll: true, replace: true });
    const setStatus = (p: Payment, status: string) => {
        if (status === 'refunded' && !window.confirm(`Mark ${p.invoice_number} as refunded?`)) return;
        router.patch(`/admin/finance/payments/${p.id}`, { status }, { preserveScroll: true, preserveState: true });
    };
    const hasAds = revenue.some((r) => r.advertising > 0);

    return (
        <>
            <Head title="Finance" />
            <PageHeader
                title="Finance"
                description="Subscriptions, advertising revenue and client payments."
                actions={
                    <>
                        <a href="/admin/finance/export?format=xlsx" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold"><Download className="size-4" />Export Excel</a>
                        <Btn onClick={() => setRecording('new')}><Plus className="size-4" />Record payment</Btn>
                    </>
                }
            />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
                <StatCard tone="dark" label="REVENUE THIS MONTH" value={money(kpis.revenue_month)} hint={kpis.revenue_change === null ? 'No revenue last month' : `${kpis.revenue_change >= 0 ? '▲' : '▼'} ${Math.abs(kpis.revenue_change)}% vs last month`} />
                <StatCard label="MONTHLY RECURRING (MRR)" value={money(kpis.mrr)} hint={`${kpis.active_subscriptions} paying subscriptions`} />
                <StatCard label="AD REVENUE THIS MONTH" value={money(kpis.ad_revenue_month)} />
                <StatCard tone={kpis.overdue_count ? 'warn' : 'plain'} label="OVERDUE" value={money(kpis.overdue_amount)} hint={kpis.overdue_count ? `${kpis.overdue_count} invoice(s)` : 'Nothing overdue'} />
            </div>

            {upgradeRequests.length > 0 && (
                <section aria-label="Plan change requests" className="mb-5 rounded-2xl border border-saffron bg-saffron-soft p-4">
                    <h2 className="mb-2 font-bold">Plan change requests ({upgradeRequests.length})</h2>
                    <ul className="flex flex-col gap-2">
                        {upgradeRequests.map((u) => (
                            <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2.5 text-sm">
                                <b>{u.restaurant}</b>
                                <span>→ {u.plan} ({u.billing_cycle})</span>
                                <span className="text-muted-ink">{u.by} · {u.created_at}</span>
                                {u.message && <span className="basis-full text-muted-ink">“{u.message}”</span>}
                                <span className="ms-auto flex gap-2">
                                    <Btn variant="outline" className="h-9" onClick={() => setRecording(u.restaurant_id)}>Record payment</Btn>
                                    <Btn variant="outline" className="h-9" onClick={() => router.patch(`/admin/finance/upgrades/${u.id}`, {}, { preserveScroll: true })}>Mark handled</Btn>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_340px]">
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-3 font-bold">Revenue by month</h2>
                    <BarChart
                        title="Paid revenue by month"
                        data={revenue}
                        xKey="month"
                        stacked
                        series={hasAds ? [{ key: 'subscriptions', label: 'Subscriptions' }, { key: 'advertising', label: 'Advertising' }] : [{ key: 'subscriptions', label: 'Subscriptions' }]}
                        formatValue={(v) => money(v)}
                    />
                </section>
                <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                    <h2 className="font-bold">MRR by plan</h2>
                    <RankedBars rows={mrrByPlan.map((p) => ({ label: p.plan, value: p.mrr, hint: `${p.count}` }))} formatValue={money} empty="No paying subscriptions yet." />
                    <div className="grid grid-cols-3 gap-2 border-t border-[#F1F0EC] pt-3 text-sm">
                        <div><div className="text-xs text-muted-ink">New</div><div className="text-lg font-extrabold">+{kpis.new_this_month}</div></div>
                        <div><div className="text-xs text-muted-ink">Cancelled</div><div className="text-lg font-extrabold">−{kpis.cancelled_this_month}</div></div>
                        <div><div className="text-xs text-muted-ink">Trials end (7d)</div><div className="text-lg font-extrabold">{kpis.trials_ending}</div></div>
                    </div>
                </section>
            </div>

            {expiring.length > 0 && (
                <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-3 font-bold">Renewals &amp; trials to follow up</h2>
                    <ul className="grid gap-2 md:grid-cols-2">
                        {expiring.map((e) => (
                            <li key={e.restaurant_id} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1"><b className="block truncate">{e.restaurant}</b><span className="text-muted-ink">{e.plan} · {e.status === 'trialing' ? 'trial ends' : 'renews'} {e.date}</span></span>
                                <button type="button" onClick={() => setRecording(e.restaurant_id)} className="h-9 rounded-lg bg-ink px-3 text-xs font-bold text-white">Record payment</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-line bg-white">
                <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                    <h2 className="mr-auto font-bold">Payments</h2>
                    <TextInput type="search" aria-label="Search payments" placeholder="Client or invoice #" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-52" />
                    <SelectInput aria-label="Status" value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value })} className="h-10">
                        <option value="">All statuses</option>
                        {options.statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </SelectInput>
                    <SelectInput aria-label="Type" value={filters.type ?? ''} onChange={(e) => apply({ type: e.target.value })} className="h-10">
                        <option value="">All types</option>
                        {Object.entries(options.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </SelectInput>
                </form>
                <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted-ink">
                                <th className="px-5 py-2.5 font-bold">INVOICE</th>
                                <th className="px-3 py-2.5 font-bold">CLIENT</th>
                                <th className="px-3 py-2.5 font-bold">FOR</th>
                                <th className="px-3 py-2.5 font-bold">METHOD</th>
                                <th className="px-3 py-2.5 font-bold">DATE</th>
                                <th className="px-3 py-2.5 text-right font-bold">AMOUNT</th>
                                <th className="px-3 py-2.5 font-bold">STATUS</th>
                                <th className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.data.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-ink">No payments yet. Use “Record payment” for cash, bank transfers or card payments.</td></tr>}
                            {payments.data.map((p) => (
                                <tr key={p.id} className="border-t border-[#F1F0EC]">
                                    <td className="px-5 py-3 font-bold">{p.invoice_number}</td>
                                    <td className="px-3 py-3">{p.restaurant?.name ?? p.payer_name}</td>
                                    <td className="px-3 py-3 text-muted-ink">{options.types[p.type]}{p.description ? ` · ${p.description}` : ''}</td>
                                    <td className="px-3 py-3">{p.method ? options.methods[p.method] : '—'}</td>
                                    <td className="px-3 py-3 text-muted-ink">{new Date(p.paid_at ?? p.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-3 py-3 text-right font-bold tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                                    <td className="px-3 py-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold capitalize', STATUS_STYLE[p.display_status])}>{p.display_status}</span></td>
                                    <td className="px-5 py-3">
                                        <span className="flex items-center justify-end gap-2">
                                            {p.display_status !== 'paid' && p.display_status !== 'refunded' && <button type="button" onClick={() => setStatus(p, 'paid')} className="text-xs font-bold text-forest hover:underline">Mark paid</button>}
                                            {p.display_status === 'paid' && <button type="button" onClick={() => setStatus(p, 'refunded')} className="text-xs font-bold text-muted-ink hover:underline">Refund</button>}
                                            <a href={`/admin/finance/payments/${p.id}/invoice`} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg hover:bg-paper" aria-label={`Invoice ${p.invoice_number}`}><FileText className="size-4" /></a>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {payments.last_page > 1 && (
                    <nav aria-label="Pagination" className="flex flex-wrap gap-1 border-t border-line px-5 py-3">
                        {payments.links.map((l, i) => l.url ? <Link key={i} href={l.url} preserveScroll className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', l.active ? 'bg-ink text-white' : 'bg-paper')}>{l.label.replace(/&laquo;|&raquo;/g, '').trim()}</Link> : null)}
                    </nav>
                )}
            </section>

            <Dialog open={recording !== null} onOpenChange={(o) => !o && setRecording(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto bg-white sm:max-w-lg">
                    {recording !== null && <RecordPayment key={String(recording)} restaurantId={typeof recording === 'number' ? recording : null} options={options} currency={currency} onDone={() => setRecording(null)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

function RecordPayment({ restaurantId, options, currency, onDone }: { restaurantId: number | null; options: Props['options']; currency: string; onDone: () => void }) {
    const firstPlan = options.plans[0];
    const form = useForm({
        payer: 'restaurant',
        restaurant_id: restaurantId ? String(restaurantId) : '',
        payer_name: '',
        type: 'subscription',
        description: '',
        amount: firstPlan?.price_monthly ?? '',
        currency,
        method: 'bank_transfer',
        status: 'paid',
        due_date: '',
        reference: '',
        notes: '',
        extend: true,
        plan_id: firstPlan ? String(firstPlan.id) : '',
        billing_cycle: 'monthly',
    });
    const { data, setData, errors } = form;
    const isSubscription = data.type === 'subscription' && data.payer === 'restaurant';

    const pickPlan = (planId: string, cycle: string) => {
        const plan = options.plans.find((p) => String(p.id) === planId);
        setData((d) => ({ ...d, plan_id: planId, billing_cycle: cycle, amount: plan ? ((cycle === 'yearly' ? plan.price_yearly : plan.price_monthly) ?? d.amount) : d.amount }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            restaurant_id: d.payer === 'restaurant' ? d.restaurant_id || null : null,
            payer_name: d.payer === 'external' ? d.payer_name : null,
            extend: isSubscription && d.status === 'paid' ? d.extend : false,
        }));
        form.post('/admin/finance/payments', { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">Record payment</DialogTitle>
                <DialogDescription>For bank transfers, cash or card payments taken outside the platform.</DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="Payer" className="inline-flex self-start rounded-xl bg-[#F1F0EC] p-1">
                {[['restaurant', 'Restaurant client'], ['external', 'Other company (ads)']].map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={data.payer === k} onClick={() => setData((d) => ({ ...d, payer: k, type: k === 'external' ? 'advertising' : d.type }))} className={cn('h-9 rounded-lg px-3 text-sm font-bold', data.payer === k ? 'bg-white shadow-sm' : 'text-muted-ink')}>{label}</button>
                ))}
            </div>

            {data.payer === 'restaurant' ? (
                <Field label="Restaurant" error={errors.restaurant_id}>
                    <SelectInput value={data.restaurant_id} onChange={(e) => setData('restaurant_id', e.target.value)} required>
                        <option value="">Choose…</option>
                        {options.restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </SelectInput>
                </Field>
            ) : (
                <Field label="Company name" error={errors.payer_name}>
                    <TextInput value={data.payer_name} onChange={(e) => setData('payer_name', e.target.value)} required />
                </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="Type" error={errors.type}>
                    <SelectInput value={data.type} onChange={(e) => setData('type', e.target.value)}>
                        {Object.entries(options.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </SelectInput>
                </Field>
                <Field label="Method" error={errors.method}>
                    <SelectInput value={data.method} onChange={(e) => setData('method', e.target.value)}>
                        {Object.entries(options.methods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </SelectInput>
                </Field>
            </div>

            {isSubscription && options.plans.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Plan" error={errors.plan_id}>
                        <SelectInput value={data.plan_id} onChange={(e) => pickPlan(e.target.value, data.billing_cycle)}>
                            {options.plans.map((p) => <option key={p.id} value={p.id}>{tr(p.name)}</option>)}
                        </SelectInput>
                    </Field>
                    <Field label="Billing" error={errors.billing_cycle}>
                        <SelectInput value={data.billing_cycle} onChange={(e) => pickPlan(data.plan_id, e.target.value)}>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </SelectInput>
                    </Field>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="Amount" error={errors.amount}>
                    <TextInput inputMode="decimal" value={data.amount} onChange={(e) => setData('amount', e.target.value)} required />
                </Field>
                <Field label="Status" error={errors.status}>
                    <SelectInput value={data.status} onChange={(e) => setData('status', e.target.value)}>
                        <option value="paid">Paid</option>
                        <option value="pending">Not paid yet (invoice)</option>
                    </SelectInput>
                </Field>
            </div>
            {data.status === 'pending' && (
                <Field label="Due date" error={errors.due_date}>
                    <TextInput type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                </Field>
            )}
            <Field label="Description (optional)" error={errors.description}>
                <TextInput value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder={data.type === 'advertising' ? 'Top banner · November' : 'Professional · monthly'} />
            </Field>
            <Field label="Bank / payment reference (optional)" error={errors.reference}>
                <TextInput value={data.reference} onChange={(e) => setData('reference', e.target.value)} />
            </Field>
            {isSubscription && data.status === 'paid' && (
                <CheckRow checked={data.extend} onChange={(v) => setData('extend', v)}>Activate / extend the subscription by one {data.billing_cycle === 'yearly' ? 'year' : 'month'}</CheckRow>
            )}
            <div className="flex gap-2">
                <Btn variant="outline" onClick={onDone}>Cancel</Btn>
                <Btn type="submit" variant="forest" className="flex-1" disabled={form.processing}>Save payment</Btn>
            </div>
        </form>
    );
}
