import { Head, usePage } from '@inertiajs/react';
import { Camera, Flame, Info, Leaf, Search, Star, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackSheet, InfoSheet, ItemSheet, Stars } from '@/components/public-menu/sheets';
import type { GuestBranch, GuestItem } from '@/components/public-menu/sheets';
import { PlateStorySheet } from '@/components/public-menu/plate-story-sheet';
import type { PlateStoryConfig } from '@/components/public-menu/plate-story-sheet';
import { strings, tagLabel } from '@/components/public-menu/strings';
import { themeStyle } from '@/components/public-menu/theme';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

type Category = { id: number; name: Translations; description: Translations | null; image_url: string | null; items: GuestItem[] };

type Props = {
    restaurant: {
        name: string;
        slug: string;
        tagline: Translations | null;
        logo_url: string | null;
        cover_url: string | null;
        theme: string;
        main_language: string;
        languages: Record<string, { name: string; native: string; dir: string }>;
        currency: { code: string; symbol: string; symbol_ar?: string; decimals: number };
        phone: string | null;
        instagram: string | null;
        google: { rating: number | null; count: number | null; url: string | null };
        plate_story: PlateStoryConfig | null;
    };
    branch: GuestBranch;
    branches: { id: number; name: string; slug: string; area: string | null }[];
    table: string | null;
    qr: string | null;
    categories: Category[];
};

const storageKey = (slug: string) => `qm-lang-${slug}`;

function initialLanguage(slug: string, main: string, available: string[]): string {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl && available.includes(fromUrl)) return fromUrl;
    try {
        const stored = window.localStorage.getItem(storageKey(slug));
        if (stored && available.includes(stored)) return stored;
    } catch { /* storage unavailable (private mode) */ }
    const browser = navigator.language?.slice(0, 2);
    if (browser && available.includes(browser)) return browser;

    return main;
}

export default function GuestMenu({ restaurant, branch, branches, table, categories }: Props) {
    const { brand } = usePage().props;
    const languageCodes = Object.keys(restaurant.languages);
    const [lang, setLang] = useState(() => initialLanguage(restaurant.slug, restaurant.main_language, languageCodes));
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(categories[0]?.id ?? null);
    const [openItem, setOpenItem] = useState<GuestItem | null>(null);
    const [sheet, setSheet] = useState<'info' | 'feedback' | 'story' | null>(null);
    const seen = useRef(new Set<string>());

    const t = strings(lang);
    const rtl = restaurant.languages[lang]?.dir === 'rtl';
    const text = useCallback(
        (value: Translations | null | undefined) => (value ? value[lang] || value[restaurant.main_language] || Object.values(value).find(Boolean) || '' : ''),
        [lang, restaurant.main_language],
    );
    const price = useCallback(
        (value: string) => {
            const n = Number(value).toLocaleString('en', { minimumFractionDigits: restaurant.currency.decimals, maximumFractionDigits: restaurant.currency.decimals });
            const symbol = lang === 'ar' ? (restaurant.currency.symbol_ar ?? restaurant.currency.code) : restaurant.currency.code;
            return `${n} ${symbol}`;
        },
        [lang, restaurant.currency],
    );

    // Analytics beacon — fire-and-forget, never blocks the guest.
    const track = useCallback(
        (event: string, subjectId?: number) => {
            const key = `${event}:${subjectId ?? ''}`;
            if (seen.current.has(key) && event !== 'search') return;
            seen.current.add(key);
            const body = new FormData();
            body.append('event', event);
            body.append('branch_id', String(branch.id));
            body.append('locale', lang);
            if (subjectId) body.append('subject_id', String(subjectId));
            navigator.sendBeacon?.(`/m/${restaurant.slug}/e`, body);
        },
        [branch.id, lang, restaurant.slug],
    );

    const switchLanguage = (code: string) => {
        setLang(code);
        try { window.localStorage.setItem(storageKey(restaurant.slug), code); } catch { /* ignore */ }
        track('language_switch');
    };

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        return () => { document.documentElement.dir = 'ltr'; };
    }, [lang, rtl]);

    // Highlight the category whose section is at the top of the screen (below the sticky tabs).
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-category]'));
            if (!sections.length) return;
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
            let current = sections[0];
            for (const section of sections) {
                if (section.getBoundingClientRect().top <= 140) current = section;
            }
            if (atBottom) current = sections[sections.length - 1];
            setActiveCategory(Number(current.dataset.category));
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
    }, [categories, query]);

    useEffect(() => {
        if (activeCategory) track('category_view', activeCategory);
    }, [activeCategory, track]);

    // Keep the active tab visible in the horizontal category bar.
    useEffect(() => {
        document.getElementById(`tab-${activeCategory}`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, [activeCategory]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return categories;
        return categories
            .map((c) => ({ ...c, items: c.items.filter((i) => [...Object.values(i.name), ...Object.values(i.description ?? {})].some((v) => v?.toLowerCase().includes(q))) }))
            .filter((c) => c.items.length > 0);
    }, [categories, query]);

    const featured = useMemo(() => categories.flatMap((c) => c.items).filter((i) => i.is_featured && i.is_available), [categories]);

    const openDish = (item: GuestItem) => {
        setOpenItem(item);
        track('item_view', item.id);
    };

    const jumpTo = (id: number) => {
        const el = document.getElementById(`cat-${id}`);
        if (!el) return;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    };

    const initials = restaurant.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const tagline = text(restaurant.tagline);

    return (
        <div dir={rtl ? 'rtl' : 'ltr'} lang={lang} style={themeStyle(restaurant.theme)} className={cn('min-h-svh bg-[var(--bg)] text-[var(--ink)]', rtl && 'font-arabic')}>
            <Head title={restaurant.name}>
                <meta name="description" content={tagline || `${restaurant.name} — ${t.menu}`} />
                <meta name="theme-color" content={restaurant.theme === 'noir' ? '#14110F' : '#FAFAF8'} />
                <meta property="og:title" content={restaurant.name} />
                {restaurant.cover_url && <meta property="og:image" content={restaurant.cover_url} />}
            </Head>

            <div className="mx-auto max-w-2xl pb-28">
                {/* Cover */}
                <header className="relative h-48 bg-[var(--hero)] bg-cover bg-center sm:h-56" style={restaurant.cover_url ? { backgroundImage: `url(${restaurant.cover_url})` } : undefined}>
                    {languageCodes.length > 1 && (
                        <div role="group" aria-label={t.language} className="absolute end-3 top-3 flex rounded-full bg-white/95 p-1 shadow">
                            {languageCodes.map((code) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => switchLanguage(code)}
                                    aria-pressed={lang === code}
                                    lang={code}
                                    className={cn('h-9 min-w-11 rounded-full px-3 text-sm font-bold', lang === code ? 'bg-[#14110F] text-white' : 'text-[#14110F]')}
                                >
                                    {code === 'en' ? 'EN' : restaurant.languages[code]?.native ?? code}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                <div className="relative -mt-7 rounded-t-[28px] bg-[var(--bg)] px-4">
                    <div className="-translate-y-9 -mb-6 grid size-[76px] place-items-center overflow-hidden rounded-[22px] border-4 border-[var(--bg)] bg-[var(--accent)] font-display text-2xl font-extrabold text-[var(--accent-ink)]">
                        {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="size-full object-cover" /> : initials}
                    </div>
                    <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">{restaurant.name}</h1>
                    {tagline && <p className="mt-0.5 text-[var(--muted)]">{tagline}</p>}

                    <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-bold">
                        {restaurant.google.rating && (
                            <a href={restaurant.google.url ?? undefined} target="_blank" rel="noreferrer" onClick={() => track('review_click')} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--chip)] px-3 py-1.5">
                                <Star className="size-3.5 fill-[#F2B33D] text-[#C98A12]" /> {restaurant.google.rating.toFixed(1)}
                                {restaurant.google.count ? <span className="font-medium text-[var(--muted)]">({restaurant.google.count.toLocaleString('en')})</span> : null}
                                <span className="font-medium">· Google</span>
                            </a>
                        )}
                        <button type="button" onClick={() => setSheet('info')} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--chip)] px-3 py-1.5">
                            <Info className="size-3.5" /> {branch.area || branch.name}
                        </button>
                        {table && <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1.5 text-[var(--accent-ink)]">{table}</span>}
                    </div>

                    <label className="mt-4 flex h-12 items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3.5">
                        <Search className="size-[18px] shrink-0 text-[var(--muted)]" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onBlur={() => query.trim() && track('search')}
                            placeholder={t.search}
                            aria-label={t.search}
                            className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)] [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && <button type="button" onClick={() => setQuery('')} aria-label={t.close} className="grid size-8 place-items-center"><X className="size-4" /></button>}
                    </label>
                </div>

                {/* Sticky category tabs */}
                {filtered.length > 1 && (
                    <nav aria-label={t.menu} className="sticky top-0 z-20 bg-[var(--bg)]/95 px-4 pb-2.5 pt-3 backdrop-blur">
                        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                            {filtered.map((c) => (
                                <button
                                    key={c.id}
                                    id={`tab-${c.id}`}
                                    type="button"
                                    onClick={() => jumpTo(c.id)}
                                    aria-current={activeCategory === c.id ? 'true' : undefined}
                                    className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors', activeCategory === c.id ? 'bg-[var(--active)] text-[var(--active-ink)]' : 'bg-[var(--chip)]')}
                                >
                                    {text(c.name)}
                                </button>
                            ))}
                        </div>
                    </nav>
                )}

                {/* Chef's picks */}
                {!query && featured.length > 0 && (
                    <section className="px-4 pt-3" aria-label={t.chefPicks}>
                        <h2 className="mb-2.5 font-display text-lg font-bold">{t.chefPicks}</h2>
                        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                            {featured.map((item) => (
                                <button key={item.id} type="button" onClick={() => openDish(item)} aria-label={`${text(item.name)}, ${price(item.price)}`} className="w-56 shrink-0 overflow-hidden rounded-[20px] bg-[#14110F] text-start text-white">
                                    <div className="h-28 bg-[#2E2A26] bg-cover bg-center" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined} />
                                    <div className="p-3">
                                        <div className="truncate font-bold">{text(item.name)}</div>
                                        <div className="mt-0.5 font-bold text-[#F2B33D]">{price(item.price)}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Menu */}
                <main className="flex flex-col gap-7 px-4 pt-5">
                    {filtered.length === 0 && <p className="py-12 text-center text-[var(--muted)]">{t.noResults}</p>}
                    {filtered.map((category) => (
                        <section key={category.id} id={`cat-${category.id}`} data-category={category.id} aria-labelledby={`h-${category.id}`} className="scroll-mt-20">
                            {category.image_url && <img src={category.image_url} alt="" className="mb-3 h-28 w-full rounded-[20px] object-cover" />}
                            <h2 id={`h-${category.id}`} className="font-display text-xl font-extrabold">{text(category.name)}</h2>
                            {text(category.description) && <p className="mt-0.5 text-sm text-[var(--muted)]">{text(category.description)}</p>}
                            <ul className="mt-3 flex flex-col gap-3">
                                {category.items.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => openDish(item)}
                                            className={cn('flex w-full gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-start', !item.is_available && 'opacity-60')}
                                        >
                                            <span className="flex min-w-0 flex-1 flex-col py-0.5 ps-1">
                                                <span className="font-bold leading-snug">{text(item.name)}</span>
                                                {text(item.description) && <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--muted)]">{text(item.description)}</span>}
                                                {item.dietary_tags.length > 0 && (
                                                    <span className="mt-1.5 flex flex-wrap gap-1">
                                                        {item.dietary_tags.map((tag) => (
                                                            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[var(--good-bg)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--good)]">
                                                                {tag === 'spicy' ? <Flame className="size-3" /> : tag === 'vegetarian' || tag === 'vegan' ? <Leaf className="size-3" /> : null}
                                                                {tagLabel(tag, lang)}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                                <span className="mt-auto flex items-baseline gap-2 pt-2">
                                                    <span className="font-extrabold">{price(item.price)}</span>
                                                    {item.compare_at_price && <span className="text-[13px] text-[var(--muted)] line-through">{price(item.compare_at_price)}</span>}
                                                    {!item.is_available && <span className="ms-auto text-xs font-bold text-[var(--bad)]">{t.soldOut}</span>}
                                                </span>
                                            </span>
                                            {item.image_url && <img src={item.image_url} alt="" loading="lazy" className="size-[104px] shrink-0 rounded-2xl object-cover" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}

                    <footer className="flex flex-col items-center gap-1 pb-4 pt-6 text-center text-xs text-[var(--muted)]">
                        {restaurant.google.rating && <Stars value={restaurant.google.rating} />}
                        <a href="/" className="font-semibold">{t.poweredBy} {brand.name}</a>
                    </footer>
                </main>
            </div>

            {/* Bottom action bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
                <div className="mx-auto flex max-w-2xl gap-2.5 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
                    <button type="button" onClick={() => setSheet('feedback')} className="h-[52px] flex-1 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)]">
                        {t.rate}
                    </button>
                    {restaurant.google.url && (
                        <a href={restaurant.google.url} target="_blank" rel="noreferrer" onClick={() => track('review_click')} aria-label={t.reviewGoogle} className="grid size-[52px] place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                            <Star className="size-5" />
                        </a>
                    )}
                    {restaurant.plate_story && (
                        <button type="button" onClick={() => setSheet('story')} aria-label={lang === 'ar' ? 'شارك طبقك' : 'Share your plate'} className="grid size-[52px] place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                            <Camera className="size-5" />
                        </button>
                    )}
                    <button type="button" onClick={() => setSheet('info')} aria-label={t.info} className="grid size-[52px] place-items-center rounded-full border border-[var(--line)]">
                        <Info className="size-5" />
                    </button>
                </div>
            </div>

            <ItemSheet item={openItem} onClose={() => setOpenItem(null)} t={t} text={text} price={price} lang={lang} />
            <InfoSheet open={sheet === 'info'} onClose={() => setSheet(null)} t={t} branch={branch} branches={branches} phone={restaurant.phone} instagram={restaurant.instagram} slug={restaurant.slug} />
            {restaurant.plate_story && (
                <PlateStorySheet
                    open={sheet === 'story'}
                    onClose={() => setSheet(null)}
                    config={restaurant.plate_story}
                    lang={lang}
                    rtl={rtl}
                    restaurant={restaurant}
                    branch={branch}
                    items={categories.flatMap((c) => c.items)}
                    text={text}
                    brandName={brand.name}
                    onShared={(id) => track('plate_story_share', id)}
                />
            )}
            <FeedbackSheet open={sheet === 'feedback'} onClose={() => setSheet(null)} t={t} slug={restaurant.slug} branchId={branch.id} lang={lang} google={restaurant.google} onReviewClick={() => track('review_click')} />
        </div>
    );
}
