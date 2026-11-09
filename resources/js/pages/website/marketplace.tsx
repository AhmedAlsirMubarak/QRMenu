import { Link, router } from '@inertiajs/react';
import { ArrowRight, LocateFixed, MapPin, Megaphone, Search, Star, Store, Tag } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pager } from '@/components/platform/pager';
import { Reveal, SplitHeading } from '@/components/website/motion';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';
import { hideOnError } from '@/lib/demo-photos';
import { cn } from '@/lib/utils';
import type { Paginated, Translations } from '@/types';

type Listing = {
    id: number; name: string; slug: string; tagline: Translations | null; logo_url: string | null; cover_url: string | null;
    venue_type: string; cuisines: string[]; cities: string[]; area: string | null; branches: number; languages: string[];
    rating: number | null; rating_count: number; google_rating: number | null; distance_km: number | null;
    offer: { id: number; title: Translations; subtitle: Translations | null } | null; ad_id?: number;
};
type Ad = { id: number; title: Translations; subtitle: Translations | null; image_url: string | null; logo_url: string | null; advertiser: string; is_restaurant: boolean; href: string };
type Section = { type: string; enabled: boolean; content: Record<Lang, Record<string, string>> };
type Props = {
    page: { seo: Record<Lang, { title?: string; description?: string }>; sections: Section[] };
    chrome: Chrome;
    filters: { q?: string; city?: string; type?: string; sort: 'top' | 'nearest' | 'newest'; near: boolean };
    cities: string[];
    venueTypes: Record<string, string>;
    sponsored: Listing[];
    listings: Paginated<Listing>;
    banner: Ad | null;
    sidebar: Ad[];
    advertiseEmail: string | null;
    minRatings: number;
};

const T = {
    en: {
        search: 'Search by name, cuisine or area', go: 'Search', allCities: 'All cities', all: 'All',
        top: 'Top rated', nearest: 'Nearest', newest: 'Newest', nearMe: 'Near me', locating: 'Locating…', denied: 'Allow location access to sort by distance.',
        sponsored: 'Sponsored', ad: 'Ad', results: (n: number) => `${n} place${n === 1 ? '' : 's'}`, empty: 'No places match. Try another city or clear the search.',
        clear: 'Clear filters', viewMenu: 'View menu', learnMore: 'Learn more', statPlaces: 'Places', statCities: 'Cities', statApp: 'App needed', statAppValue: 'None', new: 'New', ratings: (n: number) => `${n} ratings`, km: 'km', branches: (n: number) => `${n} branches`, open: 'Open menu',
    },
    ar: {
        search: 'ابحث بالاسم أو المطبخ أو المنطقة', go: 'بحث', allCities: 'كل المدن', all: 'الكل',
        top: 'الأعلى تقييماً', nearest: 'الأقرب', newest: 'الأحدث', nearMe: 'بالقرب مني', locating: 'جارٍ تحديد الموقع…', denied: 'اسمح بالوصول إلى الموقع للترتيب حسب المسافة.',
        sponsored: 'مُموَّل', ad: 'إعلان', results: (n: number) => `${n} مكان`, empty: 'لا توجد أماكن مطابقة. جرّب مدينة أخرى أو امسح البحث.',
        clear: 'مسح الفلاتر', viewMenu: 'عرض القائمة', learnMore: 'اعرف المزيد', statPlaces: 'أماكن', statCities: 'مدن', statApp: 'تطبيق مطلوب', statAppValue: 'لا شيء', new: 'جديد', ratings: (n: number) => `${n} تقييم`, km: 'كم', branches: (n: number) => `${n} فروع`, open: 'افتح القائمة',
    },
};
const TYPE_AR: Record<string, string> = { restaurant: 'مطعم', cafe: 'مقهى', bakery: 'مخبز', dessert: 'حلويات', juice: 'عصائر', lounge: 'لاونج' };

const tx = (v: Translations | null | undefined, lang: Lang) => (v?.[lang] || v?.en || '') as string;

export default function Marketplace(props: Props) {
    const { page, chrome, filters, cities, venueTypes, sponsored, listings, banner, sidebar, advertiseEmail } = props;
    const intro = page.sections.find((s) => s.type === 'intro');
    const advertise = page.sections.find((s) => s.type === 'advertise');
    const [q, setQ] = useState(filters.q ?? '');
    const [locating, setLocating] = useState(false);
    const [geoError, setGeoError] = useState(false);

    const apply = (next: Record<string, string | number | undefined>) => {
        const query = { q, city: filters.city, type: filters.type, sort: filters.sort, ...next };
        const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''));
        router.get('/marketplace', clean, { preserveState: true, preserveScroll: true, replace: true });
    };

    const nearMe = () => {
        if (!navigator.geolocation) return setGeoError(true);
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                setGeoError(false);
                apply({ sort: 'nearest', lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
            },
            () => {
                setLocating(false);
                setGeoError(true);
            },
            { timeout: 10000, maximumAge: 300000 },
        );
    };

    const total = listings.total + sponsored.length;

    return (
        <SiteShell chrome={chrome} seo={page.seo} active="marketplace">
            {(lang) => {
                const t = T[lang];
                const c = pick(intro?.content, lang);
                const a = pick(advertise?.content, lang);
                const typeLabel = (k: string) => (lang === 'ar' ? TYPE_AR[k] : undefined) ?? venueTypes[k] ?? k;
                const sorts = [
                    { key: 'top', label: t.top },
                    { key: 'nearest', label: locating ? t.locating : t.nearest },
                    { key: 'newest', label: t.newest },
                ] as const;

                return (
                    <>
                        {/* Hero band: full-bleed, with the search bar overlapping its bottom edge. */}
                        <section className="relative overflow-hidden bg-forest-deep text-white">
                            <span className="pointer-events-none absolute -end-32 -top-40 size-[520px] rounded-full bg-forest opacity-60" aria-hidden />
                            <span className="pointer-events-none absolute -bottom-40 start-1/3 size-[360px] rounded-full bg-saffron/10" aria-hidden />
                            <div className="relative grid items-end gap-10 px-5 pb-20 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-10 lg:pb-28 xl:px-16">
                                <div>
                                    {intro?.enabled !== false && (
                                        <>
                                            <SplitHeading as="h1" onScroll={false} rtl={lang === 'ar'} className="mb-4 max-w-[720px] font-display text-[clamp(38px,5.2vw,68px)] font-extrabold leading-[1.02] tracking-[-0.035em]">{c.title}</SplitHeading>
                                            <Reveal delay={0.15}><p className="max-w-[540px] text-lg leading-relaxed text-mint/90">{c.subtitle}</p></Reveal>
                                        </>
                                    )}
                                    <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                                        <div><dt className="text-xs font-bold uppercase tracking-wider text-mint/70">{t.statPlaces}</dt><dd className="font-display text-3xl font-extrabold text-saffron tabular-nums">{total}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase tracking-wider text-mint/70">{t.statCities}</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{cities.length}</dd></div>
                                        <div><dt className="text-xs font-bold uppercase tracking-wider text-mint/70">{t.statApp}</dt><dd className="font-display text-3xl font-extrabold">{t.statAppValue}</dd></div>
                                    </dl>
                                </div>
                                <Collage items={[...sponsored, ...listings.data].filter((r) => r.cover_url).slice(0, 3)} />
                            </div>
                        </section>

                        <div className="relative z-10 -mt-9 px-5 sm:px-6 lg:px-10 xl:px-16">
                            <form role="search" onSubmit={(e: FormEvent) => { e.preventDefault(); apply({}); }} className="mx-auto flex max-w-[1100px] flex-col gap-2 rounded-[28px] border border-line bg-white p-2 shadow-[0_24px_60px_-28px_rgba(20,17,15,0.45)] sm:flex-row">
                                <label className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                                    <Search className="size-5 shrink-0 text-muted-ink" />
                                    <span className="sr-only">{t.search}</span>
                                    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="h-14 w-full min-w-0 bg-transparent text-[16px] outline-none" />
                                </label>
                                <label className="flex items-center gap-2 border-line px-3 sm:border-s">
                                    <MapPin className="size-5 shrink-0 text-muted-ink" />
                                    <span className="sr-only">{t.allCities}</span>
                                    <select value={filters.city ?? ''} onChange={(e) => apply({ city: e.target.value || undefined })} className="h-14 w-full bg-transparent text-[15px] font-semibold outline-none sm:w-44">
                                        <option value="">{t.allCities}</option>
                                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </label>
                                <button type="submit" className="h-14 rounded-full bg-ink px-8 font-bold text-white transition-colors hover:bg-forest">{t.go}</button>
                            </form>
                        </div>

                        {/* Filter toolbar stays under the site header while scrolling. */}
                        <div className="sticky top-[72px] z-20 mt-6 border-b border-line bg-paper/90 backdrop-blur-md">
                            <div className="flex items-center gap-3 px-5 py-3 sm:px-6 lg:px-10 xl:px-16">
                                <div role="group" aria-label="Type" className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
                                    {[['', t.all] as const, ...Object.keys(venueTypes).map((k) => [k, typeLabel(k)] as const)].map(([k, label]) => (
                                        <button key={k || 'all'} type="button" onClick={() => apply({ type: k || undefined })} aria-pressed={(filters.type ?? '') === k} className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors', (filters.type ?? '') === k ? 'bg-ink text-white' : 'border border-line-strong bg-white hover:bg-sand')}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div role="group" aria-label="Sort" className="hidden shrink-0 rounded-full bg-[#ECEAE4] p-1 md:inline-flex">
                                    {sorts.map((s) => (
                                        <button
                                            key={s.key}
                                            type="button"
                                            onClick={() => (s.key === 'nearest' ? nearMe() : apply({ sort: s.key }))}
                                            aria-pressed={filters.sort === s.key}
                                            className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold', filters.sort === s.key ? 'bg-white shadow-sm' : 'text-muted-ink')}
                                        >
                                            {s.key === 'nearest' && <LocateFixed className="size-4" />}{s.label}
                                        </button>
                                    ))}
                                </div>
                                <label className="shrink-0 md:hidden">
                                    <span className="sr-only">Sort</span>
                                    <select value={filters.sort} onChange={(e) => (e.target.value === 'nearest' ? nearMe() : apply({ sort: e.target.value }))} className="h-10 rounded-full border border-line-strong bg-white px-3 text-sm font-bold">
                                        {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                                    </select>
                                </label>
                            </div>
                            {geoError && <p role="alert" className="px-5 pb-2 text-sm font-semibold text-clay sm:px-6 lg:px-10 xl:px-16">{t.denied}</p>}
                        </div>

                        <div className="h-6" />
                        {banner && (
                            <section aria-label={t.ad} className="px-5 pb-8 sm:px-6 lg:px-10 xl:px-16">
                                <a href={banner.href} className="group relative flex min-h-[150px] items-end overflow-hidden rounded-3xl bg-forest-deep px-6 pb-6 pt-12 text-white sm:px-8 sm:pb-8 sm:pt-12">
                                    {banner.image_url && <img src={banner.image_url} alt="" className="absolute inset-0 size-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105" />}
                                    <span className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/40 to-transparent rtl:bg-gradient-to-t" />
                                    <span className="absolute end-4 top-4 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-ink">{t.ad} · {banner.advertiser}</span>
                                    <span className="relative flex w-full flex-wrap items-end justify-between gap-4">
                                        <span>
                                            <span dir="auto" className="block font-display text-[clamp(24px,3.5vw,36px)] font-extrabold leading-tight">{tx(banner.title, lang)}</span>
                                            {tx(banner.subtitle, lang) && <span dir="auto" className="mt-1 block max-w-[560px] text-[15px] text-white/85">{tx(banner.subtitle, lang)}</span>}
                                        </span>
                                        <span className="grid size-12 place-items-center rounded-full bg-saffron text-ink"><ArrowRight className="size-5 rtl:rotate-180" /></span>
                                    </span>
                                </a>
                            </section>
                        )}

                        <section className="grid gap-8 px-5 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 xl:px-16 2xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-w-0">
                                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
                                    <h2 className="font-display text-2xl font-extrabold tracking-tight">{t.results(total)}</h2>
                                    {(filters.city || filters.type || filters.q) && (
                                        <>
                                            <span className="text-sm text-muted-ink">{[filters.q && `“${filters.q}”`, filters.type && typeLabel(filters.type), filters.city].filter(Boolean).join(' · ')}</span>
                                            <Link href="/marketplace" className="text-sm font-bold text-forest hover:underline">{t.clear}</Link>
                                        </>
                                    )}
                                </div>
                                {total === 0 ? (
                                    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-white px-6 py-20 text-center text-muted-ink">
                                        <Store className="size-9" />{t.empty}
                                        <Link href="/marketplace" className="font-bold text-forest">{t.clear}</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-5">
                                        {sponsored.map((r) => <Card key={`s${r.id}`} r={r} lang={lang} t={t} typeLabel={typeLabel} sponsored />)}
                                        {listings.data.map((r) => <Card key={r.id} r={r} lang={lang} t={t} typeLabel={typeLabel} />)}
                                    </div>
                                )}
                                <Pager page={listings} />
                            </div>

                            <aside className="flex flex-col gap-4 lg:sticky lg:top-[150px] lg:self-start">
                                {sidebar.map((ad) => <SideAd key={ad.id} ad={ad} lang={lang} t={t} />)}
                                {advertise?.enabled !== false && (
                                    <div className="rounded-3xl bg-ink p-5 text-white">
                                        <Megaphone className="mb-3 size-6 text-saffron" />
                                        <div className="font-display text-xl font-bold">{a.title}</div>
                                        <p className="mt-1.5 text-sm text-[#CFCAC2]">{a.text}</p>
                                        <Link href="/contact?topic=advertising" className="mt-4 inline-flex h-11 items-center rounded-full bg-saffron px-5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">{a.button}</Link>
                                    </div>
                                )}
                            </aside>
                        </section>
                    </>
                );
            }}
        </SiteShell>
    );
}

function Card({ r, lang, t, typeLabel, sponsored = false }: { r: Listing; lang: Lang; t: (typeof T)['en']; typeLabel: (k: string) => string; sponsored?: boolean }) {
    const href = sponsored && r.ad_id ? `/ads/${r.ad_id}/click` : r.offer ? `/ads/${r.offer.id}/click` : `/${r.slug}?src=marketplace`;
    const meta = [typeLabel(r.venue_type), ...r.cuisines.slice(0, 2)].join(' · ');
    const place = [r.area, r.cities[0]].filter(Boolean).join(', ');

    return (
        <a href={href} aria-label={`${r.name} — ${t.open}`} className={cn('group flex flex-col overflow-hidden rounded-3xl border bg-white transition-transform hover:-translate-y-1', sponsored ? 'border-saffron ring-1 ring-saffron' : 'border-line')}>
            <div className="relative aspect-[16/10] bg-sand">
                <div className="absolute inset-0 overflow-hidden">
                    {r.cover_url ? (
                        <img src={r.cover_url} alt="" loading="lazy" onError={hideOnError} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#F7D58C,transparent_60%),linear-gradient(135deg,#F2B33D,#E3962A)]" />
                    )}
                </div>
                {sponsored && <span className="absolute start-3 top-3 rounded-full bg-saffron px-2.5 py-0.5 text-[11px] font-bold text-ink">{t.sponsored}</span>}
                {r.offer && (
                    <span className="absolute end-3 top-3 inline-flex max-w-[70%] items-center gap-1 truncate rounded-full bg-clay px-2.5 py-1 text-[11px] font-bold text-white">
                        <Tag className="size-3 shrink-0" /><span className="truncate">{tx(r.offer.title, lang)}</span>
                    </span>
                )}
                <span className="absolute -bottom-6 start-4 z-10 grid size-14 place-items-center overflow-hidden rounded-2xl border-[3px] border-white bg-ink font-display font-extrabold text-saffron">
                    {r.name.slice(0, 2).toUpperCase()}
                    {r.logo_url && <img src={r.logo_url} alt="" onError={hideOnError} className="absolute inset-0 size-full bg-white object-cover" />}
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-8">
                <div className="flex items-start gap-2">
                    <span dir="auto" className="min-w-0 flex-1 truncate text-start font-display text-lg font-bold">{r.name}</span>
                    {r.rating !== null ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-xs font-bold text-white" title={t.ratings(r.rating_count)}>
                            <Star className="size-3 fill-saffron text-saffron" />{r.rating.toFixed(1)}
                        </span>
                    ) : (
                        <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-forest">{t.new}</span>
                    )}
                </div>
                <div className="truncate text-sm text-muted-ink">{meta}</div>
                <div className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-muted-ink">
                    <MapPin className="size-3.5 shrink-0" />
                    <span dir="auto" className="truncate">{place || '—'}</span>
                    {r.distance_km !== null && <span className="ms-auto shrink-0 font-bold text-ink tabular-nums">{r.distance_km} {t.km}</span>}
                    {r.distance_km === null && r.branches > 1 && <span className="ms-auto shrink-0">{t.branches(r.branches)}</span>}
                </div>
            </div>
        </a>
    );
}

function SideAd({ ad, lang, t }: { ad: Ad; lang: Lang; t: (typeof T)['en'] }) {
    const title = tx(ad.title, lang);
    const subtitle = tx(ad.subtitle, lang);
    const initials = ad.advertiser.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    return (
        <a href={ad.href} className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_12px_40px_-24px_rgba(20,17,15,0.35)] transition-transform hover:-translate-y-0.5">
            <div className="relative aspect-[16/10] overflow-hidden bg-forest-deep">
                {ad.image_url ? (
                    <img src={ad.image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(242,179,61,0.55),transparent_55%),linear-gradient(140deg,#0E4D3F,#0B2E26)]" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-ink">{t.ad}</span>
                {!ad.image_url && !ad.logo_url && (
                    <span className="absolute inset-0 grid place-items-center font-display text-4xl font-extrabold text-saffron/90">{initials}</span>
                )}
            </div>
            <div className="flex flex-col gap-2 p-4">
                <span className="flex items-center gap-2">
                    {ad.logo_url ? (
                        <img src={ad.logo_url} alt="" className="size-7 rounded-lg border border-line object-cover" />
                    ) : (
                        <span className="grid size-7 place-items-center rounded-lg bg-saffron text-[11px] font-extrabold text-ink">{initials}</span>
                    )}
                    <span dir="auto" className="min-w-0 truncate text-sm font-semibold text-muted-ink">{ad.advertiser}</span>
                </span>
                {title && <span dir="auto" className="font-display text-xl font-bold leading-snug">{title}</span>}
                {subtitle && <span dir="auto" className="text-sm leading-relaxed text-muted-ink">{subtitle}</span>}
                <span className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-bold text-white transition-colors group-hover:bg-forest">
                    {ad.is_restaurant ? t.viewMenu : t.learnMore}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                </span>
            </div>
        </a>
    );
}

/** Three overlapping cover photos from the current results (desktop only). */
function Collage({ items }: { items: Listing[] }) {
    if (items.length === 0) return <div className="hidden lg:block" />;

    const spots = ['start-[4%] top-8 w-[42%] -rotate-3', 'end-[2%] top-0 w-[40%] rotate-3', 'start-[30%] top-[30%] w-[38%] -rotate-1'];
    return (
        <div className="relative hidden h-[260px] self-center lg:block" aria-hidden>
            {items.map((r, i) => (
                <div key={r.id} className={cn('absolute overflow-hidden rounded-2xl border-4 border-white/90 bg-forest shadow-[0_24px_50px_rgba(0,0,0,0.35)]', spots[i])}>
                    <img src={r.cover_url ?? ''} alt="" onError={hideOnError} className="aspect-[4/3] w-full object-cover" />
                    <span dir="auto" className="absolute bottom-2 start-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink">{r.name}</span>
                </div>
            ))}
        </div>
    );
}
