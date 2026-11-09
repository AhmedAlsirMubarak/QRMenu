import { Link, usePage } from '@inertiajs/react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';

const tabs = [
    { title: 'Profile', href: '/settings/profile', icon: UserRound, hint: 'Name & email' },
    { title: 'Security', href: '/settings/security', icon: KeyRound, hint: 'Password, 2FA & passkeys' },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const page = usePage();
    const { auth } = page.props;
    const path = page.url.split('?')[0];
    const initials = auth.user.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    return (
        <div className="brand-ui">
            <PageHeader title="Account" description="Your personal details and how you sign in." />

            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
                    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-saffron font-display text-lg font-extrabold text-ink">{initials}</span>
                        <span className="min-w-0">
                            <b className="block truncate">{auth.user.name}</b>
                            <span className="block truncate text-sm text-muted-ink">{auth.user.email}</span>
                            {auth.isSuperAdmin && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold text-white">
                                    <ShieldCheck className="size-3" /> Super admin
                                </span>
                            )}
                        </span>
                    </div>

                    <nav aria-label="Account settings" className="flex gap-2 overflow-x-auto lg:flex-col">
                        {tabs.map((t) => {
                            const active = path.startsWith(t.href);
                            return (
                                <Link
                                    key={t.href}
                                    href={t.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex min-w-max items-center gap-3 rounded-2xl border px-4 py-3 transition-colors lg:min-w-0',
                                        active ? 'border-forest bg-white shadow-[0_8px_24px_-16px_rgba(14,77,63,0.5)]' : 'border-transparent hover:bg-white',
                                    )}
                                >
                                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', active ? 'bg-forest text-white' : 'border border-line bg-white text-ink')}>
                                        <t.icon className="size-4" />
                                    </span>
                                    <span>
                                        <b className="block text-sm">{t.title}</b>
                                        <span className="hidden text-xs text-muted-ink lg:block">{t.hint}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <section className="account-cards flex min-w-0 max-w-[720px] flex-col gap-5">{children}</section>
            </div>
        </div>
    );
}
