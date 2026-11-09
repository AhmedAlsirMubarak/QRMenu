import { router, usePage } from '@inertiajs/react';
import { BarChart3, Building, CalendarClock, Camera, FileSpreadsheet, LayoutDashboard, MessageSquareText, QrCode, Receipt, Store, UtensilsCrossed, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { DashboardShell, UserFooter } from '@/components/platform/side-nav';
import { formatMoney } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SideNavItem } from '@/components/platform/side-nav';

const items: SideNavItem[] = [
    { title: 'Overview', href: '/app', icon: LayoutDashboard },
    { title: 'Menu', href: '/app/menu', icon: UtensilsCrossed },
    { title: 'Import / Export', href: '/app/menu/import', icon: FileSpreadsheet },
    { title: 'QR codes', href: '/app/qr', icon: QrCode },
    { title: 'Branches', href: '/app/branches', icon: Building },
    { title: 'Feedback', href: '/app/feedback', icon: MessageSquareText },
    { title: 'Plate Story', href: '/app/plate-story', icon: Camera },
    { title: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    { title: 'Profile & Google', href: '/app/profile', icon: Store },
    { title: 'Staff', href: '/app/staff', icon: Users },
    { title: 'Billing', href: '/app/billing', icon: Receipt },
];

function RestaurantSwitcher() {
    const { restaurant } = usePage().props;

    if (!restaurant) return null;

    const initials = restaurant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    return (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-ink-2 p-2.5 text-white">
            {restaurant.logo ? (
                <img src={restaurant.logo} alt="" className="size-8 rounded-[9px] object-cover" />
            ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-saffron text-xs font-extrabold text-ink">{initials}</span>
            )}
            {restaurant.memberships.length > 1 ? (
                <label className="min-w-0 flex-1">
                    <span className="sr-only">Switch restaurant</span>
                    <select
                        value={restaurant.id}
                        onChange={(e) => router.post('/app/switch', { restaurant_id: Number(e.target.value) })}
                        className="w-full truncate bg-transparent text-sm font-bold outline-none"
                    >
                        {restaurant.memberships.map((m) => (
                            <option key={m.id} value={m.id} className="text-ink">
                                {m.name}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{restaurant.name}</span>
                    <span className="block text-xs capitalize text-[#B5B0A8]">{restaurant.role}</span>
                </span>
            )}
        </div>
    );
}

function SubscriptionBanner() {
    const { restaurant, brand } = usePage().props;
    if (!restaurant || restaurant.menu_live !== false) return null;
    const trial = restaurant.subscription_status === 'expired' || restaurant.subscription_status === 'trialing';

    return (
        <div role="alert" className="mb-5 rounded-2xl border border-[#F0D2C4] bg-clay-soft px-4 py-3 text-sm">
            <b className="text-clay">{trial ? 'Your free trial has ended — ' : 'Your subscription has expired — '}your menu is offline for guests and this dashboard is read-only.</b>{' '}
            You can still view everything and export your menu. Renew to bring it back instantly — {brand.name} keeps your data for 90 days.{' '}
            <a href="/app/billing" className="font-bold underline">Renew in Billing</a>
        </div>
    );
}

/** Heads-up before anything breaks: plan ending within 7 days, or invoices waiting to be paid (owners only). */
function BillingNotices() {
    const { restaurant } = usePage().props;
    if (!restaurant || restaurant.role !== 'owner' || restaurant.menu_live === false) return null;

    const notices: { tone: 'warn' | 'danger'; text: ReactNode; href: string; cta: string }[] = [];

    if (restaurant.subscription_ends_at && ['trialing', 'active'].includes(restaurant.subscription_status ?? '')) {
        const days = Math.ceil((new Date(restaurant.subscription_ends_at).getTime() - Date.now()) / 864e5);
        if (days <= 7) {
            const trial = restaurant.subscription_status === 'trialing';
            const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
            notices.push({ tone: days <= 2 ? 'danger' : 'warn', text: <><b>{trial ? 'Your free trial' : 'Your plan'} ends {when}.</b> Choose a plan to keep your menu and QR codes online.</>, href: '/app/billing', cta: trial ? 'Choose a plan' : 'Renew' });
        }
    }

    for (const inv of restaurant.unpaid_invoices ?? []) {
        const due = inv.due_date ? new Date(`${inv.due_date}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : null;
        notices.push({
            tone: inv.overdue ? 'danger' : 'warn',
            text: <><b>Invoice {inv.number}</b> · {formatMoney(inv.amount, inv.currency)} {inv.overdue ? <>was due {due} and is <b>overdue</b>.</> : due ? <>is due {due}.</> : 'is waiting for payment.'}</>,
            href: `/app/billing/invoices/${inv.id}`,
            cta: 'View invoice',
        });
    }

    if (notices.length === 0) return null;

    return (
        <div className="mb-5 flex flex-col gap-2">
            {notices.slice(0, 3).map((n, i) => (
                <div key={i} role="status" className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm', n.tone === 'danger' ? 'border-[#F0D2C4] bg-clay-soft' : 'border-[#F2DFAE] bg-saffron-soft')}>
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', n.tone === 'danger' ? 'bg-clay text-white' : 'bg-saffron text-ink')}>
                        <CalendarClock className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">{n.text}</span>
                    <a href={n.href} className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-xs font-bold text-white">{n.cta}</a>
                </div>
            ))}
        </div>
    );
}

export default function RestaurantLayout({ children }: { children: ReactNode }) {
    return (
        <DashboardShell items={items} tone="ink" top={<RestaurantSwitcher />} footer={<UserFooter />}>
            <SubscriptionBanner />
            <BillingNotices />
            {children}
        </DashboardShell>
    );
}
