import { Head, Link, usePage, usePoll } from '@inertiajs/react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { plural, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import type { Subscription } from '@/types';

type Props = {
    stats: {
        scans_30d: number;
        menu_views_30d: number;
        feedback_30d: number;
        avg_rating: number;
        categories: number;
        items: number;
        branches: number;
    };
    setup: {
        has_categories: boolean;
        has_items: boolean;
        has_item_photos: boolean;
        has_logo: boolean;
        has_google_url: boolean;
    };
    subscription: Subscription | null;
    menuUrl: string;
};

export default function RestaurantDashboard({
    stats,
    setup,
    subscription,
    menuUrl,
}: Props) {
    const { restaurant } = usePage().props;
    const [copied, setCopied] = useState(false);

    // Keep the numbers live for owners and staff: refresh this page's data every 30s (slower while the tab is in the background).
    usePoll(30_000, { only: ['stats', 'setup', 'subscription'] });

    const steps = [
        { done: true, label: 'Create your restaurant' },
        { done: setup.has_categories, label: 'Add menu categories' },
        { done: setup.has_items, label: 'Add dishes with prices' },
        { done: setup.has_item_photos, label: 'Add photos to your dishes' },
        { done: setup.has_logo, label: 'Upload your logo and cover photo' },
        { done: setup.has_google_url, label: 'Add your Google review link' },
    ];
    const doneCount = steps.filter((s) => s.done).length;

    const trialDays =
        subscription?.status === 'trialing' && subscription.trial_ends_at
            ? Math.max(
                  0,
                  Math.ceil(
                      (new Date(subscription.trial_ends_at).getTime() -
                          Date.now()) /
                          86_400_000,
                  ),
              )
            : null;

    return (
        <>
            <Head title="Overview" />
            <PageHeader
                title={`Welcome, ${restaurant?.name ?? ''}`}
                description={
                    trialDays !== null
                        ? `${tr(subscription?.plan?.name)} plan · free trial, ${trialDays} days left`
                        : subscription
                          ? `${tr(subscription.plan?.name)} plan`
                          : undefined
                }
            />

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-muted-ink">
                        YOUR MENU LINK — PRINTED QR CODES ALWAYS POINT HERE
                    </div>
                    <div className="truncate font-bold">{menuUrl}</div>
                </div>
                <button
                    type="button"
                    onClick={async () => {
                        if (!(await copyText(menuUrl))) return;
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-bold"
                >
                    {copied ? (
                        <Check className="size-4" />
                    ) : (
                        <Copy className="size-4" />
                    )}{' '}
                    {copied ? 'Copied' : 'Copy'}
                </button>
                <a
                    href={menuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white"
                >
                    Open menu <ExternalLink className="size-4" />
                </a>
            </div>

            <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                <StatCard label="QR SCANS · 30 DAYS" value={stats.scans_30d} />
                <StatCard
                    label="MENU VIEWS · 30 DAYS"
                    value={stats.menu_views_30d}
                />
                <StatCard
                    label="FEEDBACK · 30 DAYS"
                    value={stats.feedback_30d}
                    hint={
                        stats.avg_rating
                            ? `Average ${stats.avg_rating} / 5`
                            : 'No ratings yet'
                    }
                />
                <StatCard
                    label="MENU"
                    value={stats.items}
                    hint={`${plural(stats.categories, 'category', 'categories')} · ${plural(stats.branches, 'branch', 'branches')}`}
                />
            </div>

            <section className="max-w-2xl rounded-2xl border border-line bg-white p-5">
                <div className="mb-3 flex items-center">
                    <h2 className="font-bold">Get your menu ready</h2>
                    <span className="ml-auto text-sm font-bold text-muted-ink">
                        {doneCount} / {steps.length}
                    </span>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#F1F0EC]">
                    <div
                        className="h-full rounded-full bg-forest"
                        style={{
                            width: `${(doneCount / steps.length) * 100}%`,
                        }}
                    />
                </div>
                <ul className="flex flex-col gap-2">
                    {steps.map((s) => (
                        <li
                            key={s.label}
                            className="flex items-center gap-3 text-sm"
                        >
                            <span
                                className={cn(
                                    'grid size-6 place-items-center rounded-full',
                                    s.done
                                        ? 'bg-forest text-white'
                                        : 'border border-line-strong',
                                )}
                            >
                                {s.done && <Check className="size-3.5" />}
                            </span>
                            <span
                                className={cn(
                                    s.done && 'text-muted-ink line-through',
                                )}
                            >
                                {s.label}
                            </span>
                        </li>
                    ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                        href="/app/menu"
                        className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-bold text-white"
                    >
                        Open menu builder
                    </Link>
                    <Link
                        href="/app/profile"
                        className="inline-flex h-11 items-center rounded-xl border border-line-strong px-4 text-sm font-bold"
                    >
                        Logo &amp; Google link
                    </Link>
                </div>
            </section>
        </>
    );
}
