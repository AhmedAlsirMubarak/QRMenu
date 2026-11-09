import { Head, useForm } from '@inertiajs/react';
import { Check, FileText } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, Field } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

type Plan = {
    id: number; name: Translations; description: Translations | null; price_monthly: string; price_yearly: string | null; currency: string;
    max_branches: number | null; max_languages: number | null; max_items: number | null; features: string[] | null; is_featured: boolean;
};
type Props = {
    subscription: { plan_id: number; plan: string | null; status: string; usable: boolean; billing_cycle: string; price: string; currency: string; trial_ends_at: string | null; ends_at: string | null } | null;
    usage: { label: string; used: number; max: number | null }[];
    features: string[];
    featureLabels: Record<string, string>;
    plans: Plan[];
    payments: { id: number; invoice_number: string; description: string | null; amount: string; currency: string; status: string; due_date: string | null; paid_at: string | null; created_at: string }[];
    pendingRequest: { plan: string | null; billing_cycle: string; created_at: string } | null;
    supportEmail: string | null;
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const STATUS: Record<string, { label: string; cls: string }> = {
    trialing: { label: 'Free trial', cls: 'bg-saffron-soft text-ink' },
    active: { label: 'Active', cls: 'bg-mint text-forest' },
    past_due: { label: 'Payment due', cls: 'bg-clay-soft text-clay' },
    cancelled: { label: 'Cancelled', cls: 'bg-[#F1F0EC] text-muted-ink' },
    expired: { label: 'Expired', cls: 'bg-clay-soft text-clay' },
    paid: { label: 'Paid', cls: 'bg-mint text-forest' },
    pending: { label: 'Pending', cls: 'bg-saffron-soft text-ink' },
    overdue: { label: 'Overdue', cls: 'bg-clay-soft text-clay' },
    failed: { label: 'Failed', cls: 'bg-clay-soft text-clay' },
    refunded: { label: 'Refunded', cls: 'bg-[#F1F0EC] text-muted-ink' },
};
const Pill = ({ status }: { status: string }) => (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS[status]?.cls ?? 'bg-sand')}>{STATUS[status]?.label ?? status}</span>
);

export default function Billing({ subscription, usage, features, featureLabels, plans, payments, pendingRequest, supportEmail }: Props) {
    const [yearly, setYearly] = useState(subscription?.billing_cycle === 'yearly');
    const form = useForm({ plan_id: 0, billing_cycle: 'monthly', message: '' });
    const chosen = plans.find((p) => p.id === form.data.plan_id);

    const pick = (p: Plan) => form.setData({ ...form.data, plan_id: p.id, billing_cycle: yearly && p.price_yearly ? 'yearly' : 'monthly' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/app/billing/request', { preserveScroll: true, onSuccess: () => form.reset() });
    };

    const renewal = subscription?.status === 'trialing' ? subscription.trial_ends_at : subscription?.ends_at;

    return (
        <>
            <Head title="Billing" />
            <PageHeader title="Billing" description="Your plan, usage and invoices." />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <section aria-label="Current plan" className="rounded-2xl border border-ink bg-ink p-5 text-white">
                    <div className="text-xs font-bold tracking-wide text-[#CFCAC2]">CURRENT PLAN</div>
                    {subscription ? (
                        <>
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                                <span className="font-display text-3xl font-extrabold">{subscription.plan}</span>
                                <Pill status={subscription.status} />
                            </div>
                            <div className="mt-2 text-[#CFCAC2]">
                                {formatMoney(subscription.price, subscription.currency)} / {subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                                {renewal && <> · {subscription.status === 'trialing' ? 'Trial ends' : subscription.usable ? 'Renews' : 'Ended'} {fmtDate(renewal)}</>}
                            </div>
                            <ul className="mt-4 flex flex-wrap gap-1.5">
                                {features.map((f) => (
                                    <li key={f} className="inline-flex items-center gap-1 rounded-full bg-ink-2 px-2.5 py-1 text-xs font-semibold"><Check className="size-3 text-saffron" />{featureLabels[f] ?? f}</li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className="mt-2">No plan yet — choose one below.</p>
                    )}
                </section>

                <section aria-label="Usage" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
                    <h2 className="font-extrabold">Usage</h2>
                    {usage.map((u) => {
                        const pct = u.max ? Math.min(100, Math.round((u.used / u.max) * 100)) : 0;
                        return (
                            <div key={u.label}>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold">{u.label}</span>
                                    <span className="tabular-nums text-muted-ink">{u.used} / {u.max ?? 'Unlimited'}</span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-label={u.label} aria-valuenow={u.used} aria-valuemax={u.max ?? undefined}>
                                    <div className={cn('h-full rounded-full', pct >= 90 ? 'bg-clay' : 'bg-forest')} style={{ width: u.max ? `${pct}%` : '6%' }} />
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>

            <section aria-label="Plans" className="mt-6">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-extrabold">Change plan</h2>
                    <div className="ms-auto inline-flex rounded-full border border-line-strong bg-white p-1 text-sm font-bold">
                        {(['monthly', 'yearly'] as const).map((c) => (
                            <button key={c} type="button" onClick={() => setYearly(c === 'yearly')} aria-pressed={yearly === (c === 'yearly')} className={cn('h-9 rounded-full px-4', yearly === (c === 'yearly') && 'bg-ink text-white')}>
                                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                            </button>
                        ))}
                    </div>
                </div>
                {pendingRequest && (
                    <p className="mb-3 rounded-xl bg-saffron-soft px-4 py-3 text-sm">
                        <b>Request sent {fmtDate(pendingRequest.created_at)}</b> to move to {pendingRequest.plan} ({pendingRequest.billing_cycle}). Our team will contact you to complete it.
                    </p>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                    {plans.map((p) => {
                        const current = subscription?.plan_id === p.id;
                        const price = yearly && p.price_yearly ? p.price_yearly : p.price_monthly;
                        const selected = form.data.plan_id === p.id;
                        // Yearly vs 12 monthly payments, e.g. 10× monthly = "2 months free".
                        const monthsFree = p.price_yearly && Number(p.price_monthly) > 0 ? Math.round(12 - Number(p.price_yearly) / Number(p.price_monthly)) : 0;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => pick(p)}
                                disabled={current}
                                aria-pressed={selected}
                                className={cn('flex flex-col gap-2 rounded-2xl border bg-white p-4 text-start transition-colors disabled:cursor-default', selected ? 'border-2 border-forest' : 'border-line hover:border-line-strong')}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="font-extrabold">{tr(p.name)}</span>
                                    {current && <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-forest">Current</span>}
                                    {!current && p.is_featured && <span className="rounded-full bg-saffron px-2 py-0.5 text-[11px] font-bold">Popular</span>}
                                </span>
                                <span><span className="font-display text-2xl font-extrabold tabular-nums">{formatMoney(price, p.currency)}</span><span className="text-sm text-muted-ink"> / {yearly && p.price_yearly ? 'year' : 'month'}</span></span>
                                {yearly && monthsFree > 0 && <span className="w-fit rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-forest">{monthsFree === 1 ? '1 month free' : `${monthsFree} months free`}</span>}
                                <span className="text-sm text-muted-ink">
                                    {p.max_branches ?? 'Unlimited'} branch{p.max_branches === 1 ? '' : 'es'} · {p.max_languages ?? 'Unlimited'} languages · {p.max_items ?? 'Unlimited'} dishes
                                </span>
                            </button>
                        );
                    })}
                </div>
                {chosen && (
                    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 rounded-2xl border border-forest bg-white p-4">
                        <p className="text-sm">Move to <b>{tr(chosen.name)}</b>, billed {form.data.billing_cycle}. We’ll confirm the price and send the invoice{supportEmail ? <> from {supportEmail}</> : null}.</p>
                        <Field label="Message (optional)" error={form.errors.message}>
                            <textarea value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} rows={2} className="rounded-[10px] border border-line-strong px-3 py-2 text-sm font-medium outline-none focus:border-forest" />
                        </Field>
                        <div className="flex gap-2">
                            <Btn variant="outline" onClick={() => form.reset()}>Cancel</Btn>
                            <Btn type="submit" variant="forest" disabled={form.processing}>Send request</Btn>
                        </div>
                    </form>
                )}
            </section>

            <section aria-label="Invoices" className="mt-6">
                <h2 className="mb-3 text-lg font-extrabold">Invoices</h2>
                {payments.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line-strong bg-white p-6 text-center text-sm text-muted-ink">No invoices yet.</p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead className="bg-paper text-start text-xs font-bold text-muted-ink">
                                <tr><th className="px-4 py-2.5 text-start">Invoice</th><th className="px-4 py-2.5 text-start">Date</th><th className="px-4 py-2.5 text-start">Description</th><th className="px-4 py-2.5 text-end">Amount</th><th className="px-4 py-2.5 text-start">Status</th><th className="px-4 py-2.5" /></tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3 font-bold">{p.invoice_number}</td>
                                        <td className="px-4 py-3">{fmtDate(p.created_at)}</td>
                                        <td className="px-4 py-3 text-muted-ink">{p.description ?? '—'}</td>
                                        <td className="px-4 py-3 text-end tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                                        <td className="px-4 py-3"><Pill status={p.status} /></td>
                                        <td className="px-4 py-3 text-end">
                                            <a href={`/app/billing/invoices/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 font-bold"><FileText className="size-4" />View</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
