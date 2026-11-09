import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/platform/brand-mark';
import { cn } from '@/lib/utils';

export type SideNavItem = {
    title: string;
    href?: string;
    icon: LucideIcon;
    soon?: boolean;
    badge?: number | null;
};

type Props = {
    items: SideNavItem[];
    tone: 'forest' | 'ink';
    eyebrow?: string;
    top?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
};

/** Shared dashboard shell: dark sidebar on desktop, slide-down menu on phones. */
export function DashboardShell({
    items,
    tone,
    eyebrow,
    top,
    footer,
    children,
}: Props) {
    const { url } = usePage();
    const [open, setOpen] = useState(false);
    const path = url.split('?')[0];

    const palette =
        tone === 'forest'
            ? {
                  bg: 'bg-forest-deep',
                  text: 'text-mint',
                  active: 'bg-saffron text-forest-deep',
                  hover: 'hover:bg-white/10',
              }
            : {
                  bg: 'bg-ink',
                  text: 'text-[#B5B0A8]',
                  active: 'bg-saffron text-ink',
                  hover: 'hover:bg-white/10',
              };

    const matches = (href?: string) => {
        if (!href) return false;
        const base = new URL(href, 'http://x').pathname;
        return (
            path === base ||
            (base.split('/').length > 2 && path.startsWith(base + '/'))
        );
    };
    // Only the most specific match is active: on /app/menu/import, "Import / Export" wins over "Menu".
    const activeHref = items
        .filter((i) => matches(i.href))
        .map((i) => i.href as string)
        .sort((a, b) => new URL(b, 'http://x').pathname.length - new URL(a, 'http://x').pathname.length)[0];
    const isActive = (href?: string) => href !== undefined && href === activeHref;

    return (
        <div className="min-h-svh bg-sand text-ink lg:flex">
            <div
                className={cn(
                    'flex items-center justify-between px-4 py-3 lg:hidden',
                    palette.bg,
                )}
            >
                <BrandMark light />
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="grid size-11 place-items-center rounded-xl text-white hover:bg-white/10"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                >
                    {open ? (
                        <X className="size-5" />
                    ) : (
                        <Menu className="size-5" />
                    )}
                </button>
            </div>

            <aside
                className={cn(
                    'flex-col gap-1 px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-[260px] lg:shrink-0 lg:overflow-y-auto',
                    palette.bg,
                    open ? 'flex' : 'hidden',
                )}
            >
                <div className="hidden px-2 pb-2 lg:block">
                    <BrandMark light />
                </div>
                {eyebrow && (
                    <div className="px-2 pb-4 text-xs font-bold tracking-wide text-saffron">
                        {eyebrow}
                    </div>
                )}
                {top}
                <nav
                    aria-label="Dashboard"
                    className="flex flex-col gap-0.5 text-sm font-semibold"
                >
                    {items.map((item) =>
                        item.soon || !item.href ? (
                            <span
                                key={item.title}
                                className={cn(
                                    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 opacity-60',
                                    palette.text,
                                )}
                            >
                                <item.icon className="size-4" aria-hidden />
                                {item.title}
                                <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">
                                    Soon
                                </span>
                            </span>
                        ) : (
                            <Link
                                key={item.title}
                                href={item.href}
                                prefetch
                                onClick={() => setOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors',
                                    isActive(item.href)
                                        ? cn(palette.active, 'font-bold')
                                        : cn(palette.text, palette.hover),
                                )}
                                aria-current={
                                    isActive(item.href) ? 'page' : undefined
                                }
                            >
                                <item.icon className="size-4" aria-hidden />
                                {item.title}
                                {item.badge ? (
                                    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-clay px-1.5 text-[11px] font-extrabold leading-5 text-white" aria-label={`${item.badge} new`}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        ),
                    )}
                </nav>
                <div className="mt-auto pt-6">{footer}</div>
            </aside>

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">{children}</main>
        </div>
    );
}

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-wrap items-end gap-3">
            <div className="min-w-0">
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-muted-ink">{description}</p>
                )}
            </div>
            {actions && (
                <div className="ml-auto flex flex-wrap gap-2">{actions}</div>
            )}
        </div>
    );
}

export function StatCard({
    label,
    value,
    hint,
    tone = 'plain',
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    tone?: 'plain' | 'dark' | 'warn';
}) {
    return (
        <div
            className={cn(
                'rounded-2xl border p-4',
                tone === 'dark' && 'border-ink bg-ink text-white',
                tone === 'plain' && 'border-line bg-white',
                tone === 'warn' && 'border-[#F0D2C4] bg-clay-soft',
            )}
        >
            <div
                className={cn(
                    'text-xs font-bold tracking-wide',
                    tone === 'dark'
                        ? 'text-[#CFCAC2]'
                        : tone === 'warn'
                          ? 'text-clay'
                          : 'text-muted-ink',
                )}
            >
                {label}
            </div>
            <div className="mt-1 font-display text-3xl font-extrabold">
                {value}
            </div>
            {hint && (
                <div
                    className={cn(
                        'mt-1 text-sm',
                        tone === 'dark' ? 'text-[#CFCAC2]' : 'text-muted-ink',
                    )}
                >
                    {hint}
                </div>
            )}
        </div>
    );
}

export function UserFooter() {
    const { auth } = usePage().props;
    const onAccount = usePage().url.startsWith('/settings');

    return (
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm text-white">
            <span className="grid size-8 place-items-center rounded-full bg-white/20 font-bold">
                {auth.user.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                    {auth.user.name}
                </span>
                <span className="flex gap-3 text-xs">
                    <Link
                        href="/settings/profile"
                        aria-current={onAccount ? 'page' : undefined}
                        className={cn('hover:text-white', onAccount ? 'font-bold text-white underline underline-offset-4' : 'text-white/70')}
                    >
                        Account
                    </Link>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-white/70 hover:text-white"
                    >
                        Log out
                    </Link>
                </span>
            </span>
        </div>
    );
}
