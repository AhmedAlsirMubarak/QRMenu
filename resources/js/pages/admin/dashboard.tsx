import { Head, Link, usePoll } from '@inertiajs/react';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { formatMoney, tr } from '@/lib/i18n';
import type { Subscription } from '@/types';

type Props = {
    stats: {
        restaurants: number;
        active_subscriptions: number;
        trials: number;
        menu_items: number;
        scans_30d: number;
        revenue_month: string;
    };
    recentRestaurants: {
        id: number;
        name: string;
        slug: string;
        status: string;
        created_at: string;
        subscription: Subscription | null;
    }[];
};

export default function AdminDashboard({ stats, recentRestaurants }: Props) {
    // Keep the numbers live: refresh this page's data every 30s (slower while the tab is in the background).
    usePoll(30_000, { only: ['stats', 'recentRestaurants'] });

    return (
        <>
            <Head title="Admin dashboard" />
            <PageHeader
                title="Platform overview"
                description="Everything happening across all restaurants."
            />

            <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
                <StatCard
                    tone="dark"
                    label="REVENUE THIS MONTH"
                    value={formatMoney(stats.revenue_month)}
                />
                <StatCard label="RESTAURANTS" value={stats.restaurants} />
                <StatCard
                    label="PAYING SUBSCRIPTIONS"
                    value={stats.active_subscriptions}
                    hint={`${stats.trials} on free trial`}
                />
                <StatCard
                    label="QR SCANS (30 DAYS)"
                    value={stats.scans_30d.toLocaleString()}
                />
                <StatCard
                    label="MENU ITEMS"
                    value={stats.menu_items.toLocaleString()}
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex items-center border-b border-line px-5 py-4">
                    <h2 className="font-bold">Newest restaurants</h2>
                    <Link
                        href="/admin/restaurants"
                        className="ml-auto text-sm font-bold text-forest"
                    >
                        View all →
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted-ink">
                                <th className="px-5 py-3 font-bold">
                                    RESTAURANT
                                </th>
                                <th className="px-3 py-3 font-bold">PLAN</th>
                                <th className="px-3 py-3 font-bold">
                                    SUBSCRIPTION
                                </th>
                                <th className="px-3 py-3 font-bold">JOINED</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRestaurants.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-8 text-center text-muted-ink"
                                    >
                                        No restaurants yet.
                                    </td>
                                </tr>
                            )}
                            {recentRestaurants.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-t border-[#F1F0EC]"
                                >
                                    <td className="px-5 py-3">
                                        <div className="font-bold">
                                            {r.name}
                                        </div>
                                        <div className="text-xs text-muted-ink">
                                            /{r.slug}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        {tr(r.subscription?.plan?.name) || '—'}
                                    </td>
                                    <td className="px-3 py-3 capitalize">
                                        {r.subscription?.status.replace(
                                            '_',
                                            ' ',
                                        ) ?? '—'}
                                    </td>
                                    <td className="px-3 py-3 text-muted-ink">
                                        {new Date(
                                            r.created_at,
                                        ).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}
