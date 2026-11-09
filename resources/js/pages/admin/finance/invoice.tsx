import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { formatMoney } from '@/lib/i18n';

type Props = {
    payment: {
        invoice_number: string;
        type: string;
        payer_name: string | null;
        description: string | null;
        amount: string;
        currency: string;
        method: string | null;
        display_status: string;
        due_date: string | null;
        paid_at: string | null;
        reference: string | null;
        created_at: string;
        restaurant: { name: string; phone: string | null; email: string | null } | null;
    };
    issuer: { name: string; email: string | null; logo: string | null };
    methods: Record<string, string>;
    types: Record<string, string>;
};

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

export default function Invoice({ payment, issuer, methods, types }: Props) {
    const client = payment.restaurant?.name ?? payment.payer_name ?? '—';
    // Super admins open invoices from Finance, restaurants from Billing.
    const back = usePage().url.startsWith('/admin') ? { href: '/admin/finance', label: 'Back to Finance' } : { href: '/app/billing', label: 'Back to Billing' };

    return (
        <div className="min-h-svh bg-sand py-8 text-ink print:bg-white print:py-0">
            <Head title={payment.invoice_number} />
            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
                <Link href={back.href} className="inline-flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold hover:underline"><ArrowLeft className="size-4" />{back.label}</Link>
                <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white"><Printer className="size-4" />Print / Save as PDF</button>
            </div>
            <article className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm print:rounded-none print:shadow-none">
                <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
                    <div className="flex items-center gap-3">
                        {issuer.logo ? <img src={issuer.logo} alt="" className="size-12 rounded-xl object-cover" /> : <span className="size-12 rounded-xl bg-saffron" />}
                        <div>
                            <div className="font-display text-2xl font-extrabold">{issuer.name}</div>
                            {issuer.email && <div className="text-sm text-muted-ink">{issuer.email}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-muted-ink">{payment.display_status === 'paid' ? 'RECEIPT' : 'INVOICE'}</div>
                        <div className="font-display text-3xl font-extrabold">{payment.invoice_number}</div>
                        <div className="text-sm text-muted-ink">Issued {date(payment.created_at)}</div>
                    </div>
                </header>

                <section className="grid gap-6 py-8 sm:grid-cols-2">
                    <div>
                        <div className="text-xs font-bold text-muted-ink">BILLED TO</div>
                        <div className="mt-1 text-lg font-bold">{client}</div>
                        {payment.restaurant?.email && <div className="text-sm">{payment.restaurant.email}</div>}
                        {payment.restaurant?.phone && <div className="text-sm">{payment.restaurant.phone}</div>}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:text-right">
                        <dt className="text-muted-ink">Status</dt><dd className="font-bold capitalize">{payment.display_status}</dd>
                        {payment.paid_at && <><dt className="text-muted-ink">Paid on</dt><dd>{date(payment.paid_at)}</dd></>}
                        {payment.due_date && payment.display_status !== 'paid' && <><dt className="text-muted-ink">Due</dt><dd>{date(payment.due_date)}</dd></>}
                        {payment.method && <><dt className="text-muted-ink">Method</dt><dd>{methods[payment.method] ?? payment.method}</dd></>}
                        {payment.reference && <><dt className="text-muted-ink">Reference</dt><dd>{payment.reference}</dd></>}
                    </dl>
                </section>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-line text-left text-xs text-muted-ink"><th className="py-2 font-bold">DESCRIPTION</th><th className="py-2 text-right font-bold">AMOUNT</th></tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-line">
                            <td className="py-4"><div className="font-semibold">{types[payment.type] ?? payment.type}</div>{payment.description && <div className="text-muted-ink">{payment.description}</div>}</td>
                            <td className="py-4 text-right tabular-nums">{formatMoney(payment.amount, payment.currency)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td className="pt-4 text-right font-bold">Total</td><td className="pt-4 text-right font-display text-2xl font-extrabold tabular-nums">{formatMoney(payment.amount, payment.currency)}</td></tr>
                    </tfoot>
                </table>
                <p className="mt-10 text-xs text-muted-ink">Thank you for your business.</p>
            </article>
        </div>
    );
}
