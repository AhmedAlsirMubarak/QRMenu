import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/platform/brand-mark';
import { useSmoothScroll } from '@/components/website/motion';
import { cn } from '@/lib/utils';

export type Lang = 'en' | 'ar';
export type Chrome = Record<Lang, Record<string, string>>;

const LangContext = createContext<Lang>('en');
export const useLang = () => useContext(LangContext);

/** Pick the active language's copy from a { en: {...}, ar: {...} } block. */
export function pick<T>(content: Partial<Record<Lang, T>> | undefined, lang: Lang): T {
    return (content?.[lang] ?? content?.en ?? {}) as T;
}

function initialLang(): Lang {
    if (typeof window === 'undefined') return 'en';
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
    try {
        const stored = window.localStorage.getItem('qm-site-lang');
        if (stored === 'ar' || stored === 'en') return stored;
    } catch { /* storage blocked */ }
    return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

type Props = {
    chrome: Chrome;
    seo: Partial<Record<Lang, { title?: string; description?: string }>>;
    active: 'home' | 'marketplace' | 'clients' | 'blog' | 'terms' | 'contact';
    children: (lang: Lang) => ReactNode;
};

export function SiteShell({ chrome, seo, active, children }: Props) {
    const { brand, auth } = usePage().props;
    const [lang, setLang] = useState<Lang>(initialLang);
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const t = chrome[lang];
    const meta = pick(seo, lang);
    const rtl = lang === 'ar';

    useSmoothScroll();

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        return () => { document.documentElement.dir = 'ltr'; };
    }, [lang, rtl]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const switchLang = () => {
        const next: Lang = rtl ? 'en' : 'ar';
        setLang(next);
        try { window.localStorage.setItem('qm-site-lang', next); } catch { /* ignore */ }
    };

    const nav = [
        { key: 'home', href: '/', label: t.home },
        { key: 'marketplace', href: '/marketplace', label: t.marketplace ?? 'Discover' },
        { key: 'clients', href: '/clients', label: t.clients },
        { key: 'pricing', href: active === 'home' ? '#pricing' : '/#pricing', label: t.pricing },
        { key: 'blog', href: '/blog', label: t.blog },
    ];

    return (
        <LangContext.Provider value={lang}>
            <div dir={rtl ? 'rtl' : 'ltr'} lang={lang} className={cn('min-h-svh bg-paper text-ink', rtl && 'font-arabic')}>
                <Head title={meta.title ?? brand.name}>
                    {meta.description && <meta name="description" content={meta.description} />}
                    <meta property="og:title" content={`${meta.title ?? ''} — ${brand.name}`} />
                    {meta.description && <meta property="og:description" content={meta.description} />}
                </Head>

                <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

                <header className={cn('sticky top-0 z-40 transition-colors', scrolled ? 'border-b border-line bg-paper/85 backdrop-blur-md' : 'bg-transparent')}>
                    <div className="flex items-center gap-6 px-5 py-3.5 sm:px-6 lg:px-10 xl:px-16">
                        <Link href="/" aria-label={brand.name}><BrandMark /></Link>
                        <nav aria-label="Main" className="hidden items-center gap-7 text-[15px] font-semibold md:flex">
                            {nav.map((n) => (
                                <Link key={n.key} href={n.href} className={cn('transition-colors hover:text-ink', active === n.key ? 'text-ink' : 'text-muted-ink')} aria-current={active === n.key ? 'page' : undefined}>
                                    {n.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="ms-auto flex items-center gap-2">
                            <button type="button" onClick={switchLang} lang={rtl ? 'en' : 'ar'} className={cn('h-10 rounded-full border border-line px-3.5 text-sm font-semibold hover:bg-white', !rtl && 'font-arabic')}>
                                {t.language}
                            </button>
                            {auth.user ? (
                                <Link href="/dashboard" className="hidden h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white sm:inline-flex">{t.dashboard}</Link>
                            ) : (
                                <>
                                    <Link href="/login" className="hidden h-11 items-center px-3 text-sm font-semibold sm:inline-flex">{t.login}</Link>
                                    <Link href="/register" className="hidden h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 sm:inline-flex">{t.start}</Link>
                                </>
                            )}
                            <button type="button" onClick={() => setOpen((v) => !v)} className="grid size-11 place-items-center rounded-full md:hidden" aria-label="Menu" aria-expanded={open}>
                                {open ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>
                    {open && (
                        <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-line bg-paper px-5 pb-5 pt-3 md:hidden">
                            {nav.map((n) => <Link key={n.key} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-semibold hover:bg-white">{n.label}</Link>)}
                            <Link href={auth.user ? '/dashboard' : '/register'} className="mt-2 flex h-12 items-center justify-center rounded-full bg-ink font-bold text-white">{auth.user ? t.dashboard : t.start}</Link>
                            {!auth.user && <Link href="/login" className="flex h-12 items-center justify-center font-semibold">{t.login}</Link>}
                        </nav>
                    )}
                </header>

                <main id="main">{children(lang)}</main>

                <footer className="border-t border-line">
                    <div className="flex flex-wrap items-center justify-between gap-6 px-5 py-9 text-sm text-muted-ink sm:px-6 lg:px-10 xl:px-16">
                        <BrandMark />
                        <nav aria-label="Footer" className="flex flex-wrap gap-6">
                            {nav.map((n) => <Link key={n.key} href={n.href} className="hover:text-ink">{n.label}</Link>)}
                            <Link href="/contact" className={cn('hover:text-ink', active === 'contact' && 'font-semibold text-ink')} aria-current={active === 'contact' ? 'page' : undefined}>{t.contact ?? 'Contact'}</Link>
                            <Link href="/terms" className={cn('hover:text-ink', active === 'terms' && 'font-semibold text-ink')} aria-current={active === 'terms' ? 'page' : undefined}>{t.terms ?? 'Terms of Service'}</Link>
                        </nav>
                        <span>© {new Date().getFullYear()} {brand.name}. {t.rights}</span>
                    </div>
                </footer>
            </div>
        </LangContext.Provider>
    );
}
