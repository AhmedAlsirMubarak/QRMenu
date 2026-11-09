import { Link } from '@inertiajs/react';
import { ArrowRight, BarChart3, Camera, Check, FileSpreadsheet, Languages, MessageSquareText, Star } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Marquee, Reveal, SplitHeading, useParallax } from '@/components/website/motion';
import { ContactSection } from '@/components/website/contact-section';
import { GoogleMark } from '@/components/website/google-mark';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';
import { DEMO_PHOTOS, hideOnError } from '@/lib/demo-photos';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

type Section = { type: string; enabled: boolean; content: Record<Lang, any> };
type Plan = {
    id: number; name: Translations; description: Translations | null; price_monthly: string; price_yearly: string | null; currency: string;
    max_branches: number | null; max_languages: number | null; max_items: number | null; features: string[] | null; trial_days: number; is_featured: boolean;
};
export type ClientCard = { name: string; slug: string; tagline: Translations | null; logo_url: string | null; cover_url: string | null; theme: string; city: string | null; languages: string[]; branches: number };

type Props = {
    page: { seo: Record<Lang, { title: string; description: string }>; sections: Section[] };
    chrome: Chrome;
    plans: Plan[];
    features: Record<string, string>;
    clients: ClientCard[];
    demoSlug: string | null;
    contactTopics?: string[];
    contactEmail?: string | null;
};

const FEATURE_ICONS = [Languages, Star, MessageSquareText, FileSpreadsheet, Camera, BarChart3];

export default function Home({ page, chrome, plans, features, clients, demoSlug, contactTopics = [], contactEmail = null }: Props) {
    return (
        <SiteShell chrome={chrome} seo={page.seo} active="home">
            {(lang) =>
                page.sections.filter((s) => s.enabled).map((s) => {
                    const c = pick(s.content, lang);
                    switch (s.type) {
                        case 'hero': return <Hero key={s.type} c={c} lang={lang} demoSlug={demoSlug} />;
                        case 'highlights': return <Highlights key={s.type} items={c.items ?? []} />;
                        case 'features': return <Features key={s.type} c={c} lang={lang} demoSlug={demoSlug} />;
                        case 'how': return <How key={s.type} c={c} lang={lang} />;
                        case 'clients': return clients.length > 0 ? <Clients key={s.type} c={c} lang={lang} clients={clients} /> : null;
                        case 'pricing': return plans.length > 0 ? <Pricing key={s.type} c={c} lang={lang} plans={plans} featureLabels={features} /> : null;
                        case 'faq': return <Faq key={s.type} c={c} lang={lang} />;
                        case 'cta': return <Cta key={s.type} c={c} lang={lang} />;
                        case 'contact': return <ContactSection key={s.type} c={c} lang={lang} topics={contactTopics} email={contactEmail} className="pt-4" />;
                        default: return null;
                    }
                })
            }
        </SiteShell>
    );
}

function Hero({ c, lang, demoSlug }: { c: any; lang: Lang; demoSlug: string | null }) {
    const blob = useParallax<HTMLDivElement>(40);

    return (
        <section className="grid items-center gap-10 px-5 pb-12 pt-8 sm:px-6 lg:px-10 xl:px-16 md:pt-10 lg:min-h-[min(calc(100svh-84px),760px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8 lg:py-6">
            <div className="min-w-0">
                <SplitHeading as="h1" onScroll={false} rtl={lang === 'ar'} className="mb-4 font-display text-[clamp(38px,4.6vw,80px)] font-extrabold leading-[1.04] tracking-[-0.035em]">
                    {c.title} <span className="text-forest">{c.highlight}</span>
                </SplitHeading>
                <Reveal delay={0.35}>
                    <p className="mb-7 max-w-[560px] text-[17px] leading-relaxed text-muted-ink 2xl:text-[19px]">{c.subtitle}</p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/register" className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-forest px-6 font-bold text-white transition-transform hover:-translate-y-0.5">
                            {c.primary_cta}
                            <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                        </Link>
                        {demoSlug && (
                            <a href={`/${demoSlug}`} className="inline-flex h-12 items-center rounded-full border border-line-strong bg-white px-6 font-bold transition-colors hover:border-ink">{c.secondary_cta}</a>
                        )}
                    </div>
                    <p className="mt-4 text-sm text-muted-ink">{c.note}</p>
                </Reveal>
            </div>

            <div className="relative flex min-w-0 justify-center py-4">
                <div ref={blob} className="absolute inset-x-4 bottom-0 top-10 rounded-[36px] bg-saffron sm:inset-x-10 lg:inset-x-2" aria-hidden />
                <Reveal y={40} delay={0.2} className="relative">
                    <PhoneMockup lang={lang} />
                </Reveal>
                <Reveal y={20} delay={0.7} className="absolute bottom-10 end-0 hidden sm:block lg:-end-6">
                    <ReviewToast lang={lang} />
                </Reveal>
                <Reveal y={16} delay={0.9} className="absolute start-0 top-6 hidden sm:block lg:-start-6">
                    <div className="flex items-center gap-2.5 rounded-2xl bg-ink px-3.5 py-2.5 text-white shadow-[0_14px_34px_rgba(20,17,15,0.22)]">
                        <span dir="ltr" className="font-display text-2xl font-extrabold text-saffron">+38</span>
                        <span className="text-xs leading-tight text-[#CFCAC2]">{lang === 'ar' ? <>تقييم جديد على جوجل<br />هذا الشهر</> : <>new Google reviews<br />this month</>}</span>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/** Floating "new 5-star Google review" notification next to the hero phone. */
function ReviewToast({ lang }: { lang: Lang }) {
    const ar = lang === 'ar';

    return (
        <div className="w-[264px] rounded-2xl bg-white p-3.5 shadow-[0_14px_34px_rgba(20,17,15,0.16)]" dir={ar ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2.5">
                <GoogleMark className="size-9" />
                <span className="min-w-0 flex-1">
                    <b className="block text-sm leading-tight">{ar ? 'تقييم جديد على جوجل' : 'New Google review'}</b>
                    <span className="flex items-center gap-0.5" aria-label={ar ? '5 نجوم' : '5 stars'}>
                        {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-3.5 fill-saffron text-saffron" />)}
                        <span className="ms-1 text-xs font-bold text-muted-ink">5.0</span>
                    </span>
                </span>
                <span className="self-start text-[11px] text-muted-ink">{ar ? 'الآن' : 'now'}</span>
            </div>
            <p className={cn('mt-2.5 rounded-xl bg-sand px-3 py-2 text-[13px] leading-snug text-ink/85', ar && 'font-arabic')}>
                {ar ? '“أفضل شكشوكة في مسقط، والقائمة بالعربي سهلة جداً!”' : '“Best shakshuka in Muscat — and the QR menu is so easy!”'}
            </p>
            <span className="mt-2 block text-[11px] font-semibold text-forest">{ar ? 'من طاولة 07 · عبر رابط التقييم في القائمة' : 'From Table 07 · via the menu’s review button'}</span>
        </div>
    );
}

function PhoneMockup({ lang }: { lang: Lang }) {
    const ar = lang === 'ar';
    const rows = ar
        ? [['شكشوكة', 'بيض، طماطم، كمون', '2.400 ر.ع', '#E9C79A'], ['مناقيش زعتر', 'نباتي · غلوتين', '1.200 ر.ع', '#C9D7B8'], ['شاي كرك', 'هيل، زعفران', '0.500 ر.ع', '#D9B9A6']]
        : [['Shakshuka', 'Eggs, tomato, cumin', '2.400 OMR', '#E9C79A'], ['Za’atar Manakish', 'Vegetarian · Gluten', '1.200 OMR', '#C9D7B8'], ['Karak Chai', 'Cardamom, saffron', '0.500 OMR', '#D9B9A6']];

    return (
        <div className="aspect-[1/2] h-[clamp(440px,calc(100svh-210px),540px)] rounded-[40px] bg-ink p-2.5 shadow-[0_30px_60px_rgba(20,17,15,0.25)]" aria-hidden>
            <div className="flex size-full flex-col overflow-hidden rounded-[31px] bg-white">
                <div className="relative h-[100px] shrink-0 bg-ink-2">
                    <span className="absolute -bottom-[22px] start-3.5 grid size-[52px] place-items-center rounded-2xl border-[3px] border-white bg-saffron font-display font-extrabold">BS</span>
                    <span className="absolute end-3 top-3 flex rounded-full bg-white/95 p-0.5 text-[10px] font-bold"><span className={cn('rounded-full px-2 py-1', !ar && 'bg-ink text-white')}>EN</span><span className={cn('rounded-full px-2 py-1', ar && 'bg-ink text-white')}>ع</span></span>
                </div>
                <div className="px-3.5 pt-8">
                    <div className="font-display text-xl font-bold">{ar ? 'بيت الزعفران' : 'Bait Al Saffron'}</div>
                    <div className="mt-0.5 text-[11px] text-muted-ink">{ar ? 'مسقط · الموج' : 'Muscat · Al Mouj'}</div>
                    <div className="mt-2.5 flex gap-1.5"><span className="rounded-full bg-saffron-soft px-2 py-1 text-[11px] font-bold">★ 4.7 Google</span></div>
                    <div className="mt-3.5 flex gap-1.5">
                        {(ar ? ['فطور', 'مشاوي', 'مشروبات'] : ['Breakfast', 'Grills', 'Drinks']).map((cat, i) => (
                            <span key={cat} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', i === 0 ? 'bg-ink text-white' : 'bg-[#F1F0EC]')}>{cat}</span>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-2.5 p-3.5">
                    {rows.map(([name, desc, price, color], i) => (
                        <div key={name} className="flex items-center gap-2.5 rounded-2xl border border-line p-2">
                            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: color }}>
                                <img src={[DEMO_PHOTOS.shakshuka, DEMO_PHOTOS.manakish, DEMO_PHOTOS.karak][i]} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
                            </span>
                            <span className="min-w-0 flex-1"><b className="block text-[13px]">{name}</b><span className="block text-[11px] text-muted-ink">{desc}</span><b className="mt-1 block text-[13px]">{price}</b></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Highlights({ items }: { items: string[] }) {
    return (
        <section className="border-y border-line bg-white py-5 text-[15px] font-bold text-muted-ink" aria-label="Highlights">
            <Marquee items={items} />
        </section>
    );
}

/** Card with a soft spotlight that follows the pointer (React-Bits-style). */
function SpotlightCard({ className, children, dark = false }: { className?: string; children: React.ReactNode; dark?: boolean }) {
    const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
    };

    return (
        <div
            onMouseMove={onMove}
            className={cn(
                'relative overflow-hidden rounded-[28px] p-8 transition-transform duration-300 hover:-translate-y-1',
                'before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity hover:before:opacity-100',
                dark ? 'bg-ink text-white before:bg-[radial-gradient(420px_circle_at_var(--x)_var(--y),rgba(242,179,61,0.18),transparent_60%)]'
                     : 'border border-line bg-white before:bg-[radial-gradient(380px_circle_at_var(--x)_var(--y),rgba(14,77,63,0.08),transparent_60%)]',
                className,
            )}
        >
            {children}
        </div>
    );
}

function Features({ c, lang, demoSlug }: { c: any; lang: Lang; demoSlug: string | null }) {
    const items: { title: string; text: string }[] = c.items ?? [];

    return (
        <section className="px-5 py-24 sm:px-6 lg:px-10 xl:px-16">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
                <SplitHeading rtl={lang === 'ar'} className="max-w-[660px] font-display text-[clamp(34px,5vw,52px)] font-extrabold leading-[1.04] tracking-[-0.03em]">{c.title}</SplitHeading>
                <Reveal><p className="max-w-[380px] text-[17px] leading-relaxed text-muted-ink">{c.subtitle}</p></Reveal>
            </div>
            <Reveal stagger={0.08} className="grid gap-4 md:grid-cols-3">
                {items.map((f, i) => {
                    const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                    const big = i === 0;
                    return (
                        <SpotlightCard key={i} dark={big} className={cn('flex min-h-[220px] flex-col gap-4', big && 'md:col-span-2 md:row-span-2', i === 3 && 'bg-saffron-soft border-transparent')}>
                            <Icon className={cn('size-8', big ? 'text-saffron' : 'text-forest')} aria-hidden />
                            <div className={big ? '' : 'mt-auto'}>
                                <h3 className={cn('mb-2 font-display font-bold tracking-tight', big ? 'text-3xl' : 'text-2xl')}>{f.title}</h3>
                                <p className={cn('leading-relaxed', big ? 'text-[#CFCAC2]' : 'text-muted-ink')}>{f.text}</p>
                            </div>
                            {big && <LanguagePreview />}
                            {big && (
                                <div className="flex flex-wrap gap-2" aria-hidden>
                                    <span className="rounded-full bg-saffron px-3.5 py-1.5 text-sm font-bold text-ink">English</span>
                                    <span className="rounded-full bg-ink-2 px-3.5 py-1.5 font-arabic text-sm font-semibold">العربية</span>
                                    <span className="rounded-full bg-ink-2 px-3.5 py-1.5 text-sm font-semibold">Français</span>
                                    <span className="rounded-full bg-ink-2 px-3.5 py-1.5 text-sm font-semibold">हिन्दी</span>
                                </div>
                            )}
                        </SpotlightCard>
                    );
                })}
            </Reveal>
            <PlateStoryShowcase c={c.plate_story ?? PLATE_STORY_FALLBACK[lang]} lang={lang} demoSlug={demoSlug} />
        </section>
    );
}

const PLATE_STORY_FALLBACK: Record<Lang, { eyebrow: string; title: string; text: string; points: string[]; cta: string }> = {
    en: { eyebrow: 'Only on QRMenu · Plate Story', title: 'Every plate becomes free advertising', text: 'Guests snap their dish straight from your menu and share a ready-to-post Instagram story with your name on it.', points: ['Camera built into the menu — no app', 'Story cards in your colours', 'Optional reward for sharing', 'You approve photos first'], cta: 'Try it on a live menu' },
    ar: { eyebrow: 'حصرياً على QRMenu · قصة الطبق', title: 'كل طبق يصبح إعلاناً مجانياً', text: 'يصوّر الضيوف أطباقهم من قائمتك ويشاركون قصة إنستغرام جاهزة تحمل اسم مطعمك.', points: ['كاميرا مدمجة — بدون تطبيق', 'بطاقات قصص بألوانك', 'مكافأة اختيارية عند المشاركة', 'توافق على الصور أولاً'], cta: 'جرّبها على قائمة حقيقية' },
};

/** Fills the big language card: the same dish as guests see it in three languages. */
function LanguagePreview() {
    const rows = [
        { lang: 'EN', name: 'Shakshuka', desc: 'Eggs, tomato, cumin', price: '2.400 OMR', dir: 'ltr' as const },
        { lang: 'ع', name: 'شكشوكة', desc: 'بيض، طماطم، كمون', price: '2.400 ر.ع', dir: 'rtl' as const },
        { lang: 'FR', name: 'Chakchouka', desc: 'Œufs, tomate, cumin', price: '2,400 OMR', dir: 'ltr' as const },
    ];

    return (
        <div className="my-2 flex flex-col gap-2.5" aria-hidden>
            {rows.map((r, i) => (
                <div key={r.lang} className={cn('max-w-[440px]', i === 1 && 'ms-6', i === 2 && 'ms-12 opacity-70')}>
                <div dir={r.dir} className={cn('flex items-center gap-3 rounded-2xl bg-ink-2 p-2.5', r.dir === 'rtl' && 'font-arabic')}>
                    <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_40%_40%,#F7C873,#C9541F)]">
                        <img src={DEMO_PHOTOS.shakshuka} alt="" loading="lazy" onError={hideOnError} className="size-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <b className="block text-sm text-white">{r.name}</b>
                        <span className="block truncate text-xs text-[#B5B0A8]">{r.desc}</span>
                    </span>
                    <b className="shrink-0 text-sm text-saffron tabular-nums">{r.price}</b>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-saffron text-[11px] font-extrabold text-ink">{r.lang}</span>
                </div>
                </div>
            ))}
        </div>
    );
}

function PlateStoryShowcase({ c, lang, demoSlug }: { c: { eyebrow: string; title: string; text: string; points: string[]; cta: string }; lang: Lang; demoSlug: string | null }) {
    const ar = lang === 'ar';

    return (
        <div className="mt-6 md:mt-8">
        <Reveal>
            <div className="relative grid items-center gap-10 overflow-hidden rounded-[32px] bg-saffron px-6 py-10 sm:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:py-12">
                <span className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-[#F7C873] opacity-60" aria-hidden />
                <div className="relative min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-saffron">
                        <Camera className="size-3.5" /> {c.eyebrow}
                    </span>
                    <h3 className="mt-4 font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">{c.title}</h3>
                    <p className="mt-3 max-w-[480px] text-[17px] leading-relaxed text-ink/75">{c.text}</p>
                    <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                        {(c.points ?? []).map((p) => (
                            <li key={p} className="flex items-start gap-2 text-[15px] font-semibold text-ink">
                                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ink"><Check className="size-3 text-saffron" /></span>
                                {p}
                            </li>
                        ))}
                    </ul>
                    {demoSlug && c.cta && (
                        <a href={`/${demoSlug}`} className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-bold text-white transition-transform hover:-translate-y-0.5">
                            {c.cta}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                        </a>
                    )}
                </div>

                <div className="relative flex min-h-[380px] items-center justify-center" aria-hidden>
                    <StoryCard className="absolute start-[6%] top-6 w-[42%] max-w-[190px] -rotate-6" before ar={ar} />
                    <StoryCard className="relative z-10 w-[48%] max-w-[220px] rotate-3 translate-x-[18%] rtl:-translate-x-[18%]" ar={ar} />
                    <span className="absolute bottom-2 end-[4%] z-20 inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-bold text-ink shadow-[0_14px_30px_rgba(20,17,15,0.18)]">
                        <span className="grid size-7 place-items-center rounded-full bg-forest text-white">🎁</span>
                        {ar ? 'كرك مجاني عند المشاركة' : 'Free karak for sharing'}
                    </span>
                </div>
            </div>
        </Reveal>
        </div>
    );
}

/** A 9:16 story card drawn in CSS: a full plate (after = empty plate) with the restaurant branding. */
function StoryCard({ className, before = false, ar }: { className?: string; before?: boolean; ar: boolean }) {
    return (
        <div className={cn('aspect-[9/16] overflow-hidden rounded-[22px] border-[5px] border-ink bg-ink shadow-[0_24px_50px_rgba(20,17,15,0.3)]', className)}>
            <div className="relative flex size-full flex-col bg-[linear-gradient(160deg,#2B2622,#14110F)] p-3 text-white">
                <img src={before ? DEMO_PHOTOS.shakshukaStory : DEMO_PHOTOS.emptyPlateStory} alt="" loading="lazy" onError={hideOnError} className="absolute inset-0 z-[1] size-full object-cover" />
                <span className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(20,17,15,0.55)_0%,transparent_28%,transparent_55%,rgba(20,17,15,0.85)_100%)]" />
                <div className="relative z-[2] flex items-center gap-1.5">
                    <span className="grid size-6 place-items-center rounded-md bg-saffron text-[9px] font-extrabold text-ink">BS</span>
                    <span dir="ltr" className="text-[10px] font-bold">@baitalsaffron</span>
                </div>
                <div className="relative mx-auto my-auto aspect-square w-[82%] rounded-full bg-[#F4EFE6] shadow-[inset_0_-6px_14px_rgba(0,0,0,0.15)]">
                    {before ? (
                        <span className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#F7D58C_0%,#E9862C_35%,#B4401A_70%)]">
                            <span className="absolute left-[30%] top-[28%] size-[22%] rounded-full bg-[#FFF6DF] shadow-[0_0_0_4px_#F7C873]" />
                            <span className="absolute right-[24%] top-[52%] size-[18%] rounded-full bg-[#FFF6DF] shadow-[0_0_0_3px_#F7C873]" />
                            <span className="absolute left-[22%] bottom-[18%] h-[6%] w-[30%] rotate-12 rounded-full bg-[#3C7A3A]" />
                        </span>
                    ) : (
                        <span className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,#EDE6D8_60%,#E2D7C3)]">
                            <span className="absolute left-[30%] top-[40%] h-[10%] w-[24%] rotate-[-18deg] rounded-full bg-[#E9862C]/40" />
                        </span>
                    )}
                </div>
                <div className={cn('relative z-[2] rounded-xl bg-black/35 p-2 backdrop-blur', ar && 'font-arabic')} dir={ar ? 'rtl' : 'ltr'}>
                    <span className="block text-[10px] font-bold text-saffron">{before ? (ar ? 'قبل' : 'BEFORE') : ar ? 'بعد — ولا لقمة باقية' : 'AFTER — not a bite left'}</span>
                    <span className="block truncate text-[12px] font-extrabold">{ar ? 'شكشوكة' : 'Shakshuka'}</span>
                    {!before && <span className="mt-1 block text-[9px] text-white/70">{ar ? 'امسح لعرض القائمة ↗' : 'Scan for the menu ↗'}</span>}
                </div>
            </div>
        </div>
    );
}

function How({ c, lang }: { c: any; lang: Lang }) {
    return (
        <section className="bg-forest text-white">
            <div className="px-5 py-24 sm:px-6 lg:px-10 xl:px-16">
                <SplitHeading rtl={lang === 'ar'} className="mb-12 font-display text-[clamp(34px,5vw,52px)] font-extrabold tracking-[-0.03em]">{c.title}</SplitHeading>
                <Reveal stagger={0.12} className="grid gap-8 md:grid-cols-3">
                    {(c.steps ?? []).map((s: { title: string; text: string }, i: number) => (
                        <div key={i} className="border-t-2 border-saffron pt-6">
                            <div className="font-display text-xl font-bold text-saffron">{String(i + 1).padStart(2, '0')}</div>
                            <h3 className="mb-2 mt-2.5 font-display text-[26px] font-bold">{s.title}</h3>
                            <p className="leading-relaxed text-mint">{s.text}</p>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}

export function ClientTile({ client, lang }: { client: ClientCard; lang: Lang }) {
    const bg: Record<string, string> = { saffron: 'bg-saffron', noir: 'bg-ink-2', garden: 'bg-[#C9D7B8]' };
    const tagline = client.tagline?.[lang] || client.tagline?.en;

    return (
        <a href={`/${client.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition-transform hover:-translate-y-1">
            <div className={cn('relative aspect-[16/10] w-full shrink-0 overflow-hidden', bg[client.theme] ?? 'bg-saffron')}>
                {client.cover_url && <img src={client.cover_url} alt="" loading="lazy" onError={hideOnError} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <span className="absolute bottom-4 start-4 grid size-14 place-items-center overflow-hidden rounded-2xl border-[3px] border-white bg-saffron font-display font-extrabold">
                    {client.name.slice(0, 2).toUpperCase()}
                    {client.logo_url && <img src={client.logo_url} alt="" onError={hideOnError} className="absolute inset-0 size-full bg-white object-cover" />}
                </span>
            </div>
            <div className="mt-auto flex items-center gap-3 p-5">
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl font-bold">{client.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-ink">{[tagline, client.city].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong transition-colors group-hover:bg-ink group-hover:text-white">
                    <ArrowRight className="size-4 -rotate-45 rtl:rotate-[225deg]" />
                </span>
            </div>
        </a>
    );
}

function Clients({ c, lang, clients }: { c: any; lang: Lang; clients: ClientCard[] }) {
    return (
        <section className="px-5 py-24 sm:px-6 lg:px-10 xl:px-16">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
                <SplitHeading rtl={lang === 'ar'} className="font-display text-[clamp(34px,5vw,52px)] font-extrabold tracking-[-0.03em]">{c.title}</SplitHeading>
                <Link href="/clients" className="font-bold text-forest">{c.link} →</Link>
            </div>
            <Reveal stagger={0.08} className="grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {clients.map((client) => <ClientTile key={client.slug} client={client} lang={lang} />)}
            </Reveal>
        </section>
    );
}

function Pricing({ c, lang, plans, featureLabels }: { c: any; lang: Lang; plans: Plan[]; featureLabels: Record<string, string> }) {
    const [yearly, setYearly] = useState(false);
    const hasYearly = plans.some((p) => p.price_yearly);
    const ar = lang === 'ar';
    const limit = (n: number | null, en: [string, string], arText: [string, string]) =>
        n === null ? (ar ? `${arText[1]} غير محدودة` : `Unlimited ${en[1]}`) : ar ? `${n} ${n === 1 ? arText[0] : arText[1]}` : `${n} ${n === 1 ? en[0] : en[1]}`;

    return (
        <section id="pricing" className="scroll-mt-20 border-t border-line bg-white">
            <div className="px-5 py-24 sm:px-6 lg:px-10 xl:px-16">
                <div className="mb-11 text-center">
                    <SplitHeading rtl={ar} className="mb-3 font-display text-[clamp(34px,5vw,52px)] font-extrabold tracking-[-0.03em]">{c.title}</SplitHeading>
                    <p className="mb-6 text-[17px] text-muted-ink">{c.subtitle}</p>
                    {hasYearly && (
                        <div role="group" aria-label="Billing period" className="inline-flex rounded-full bg-[#F1F0EC] p-1">
                            {[false, true].map((y) => (
                                <button key={String(y)} type="button" onClick={() => setYearly(y)} aria-pressed={yearly === y} className={cn('h-10 rounded-full px-5 text-sm font-bold transition-colors', yearly === y ? 'bg-ink text-white' : '')}>
                                    {y ? (ar ? 'سنوي' : 'Yearly') : (ar ? 'شهري' : 'Monthly')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Reveal stagger={0.1} className="mx-auto grid max-w-[1280px] items-stretch gap-5 md:grid-cols-3">
                    {plans.map((plan) => {
                        const price = yearly && plan.price_yearly ? Number(plan.price_yearly) : Number(plan.price_monthly);
                        const dark = plan.is_featured;
                        const name = plan.name[lang] || plan.name.en;
                        return (
                            <div key={plan.id} className={cn('relative flex flex-col gap-5 rounded-[28px] p-8', dark ? 'bg-ink text-white' : 'border border-line')}>
                                {dark && <span className="absolute end-6 top-6 rounded-full bg-saffron px-2.5 py-1 text-xs font-bold text-ink">{c.popular}</span>}
                                <div>
                                    <div className="text-lg font-bold">{name}</div>
                                    {(plan.description?.[lang] || plan.description?.en) && <div className={cn('text-[15px]', dark ? 'text-[#CFCAC2]' : 'text-muted-ink')}>{plan.description?.[lang] || plan.description?.en}</div>}
                                </div>
                                <div>
                                    <span className="font-display text-[52px] font-extrabold tabular-nums">{Number(price.toFixed(3)).toString()}</span>
                                    <span className="font-bold"> {plan.currency}</span>
                                    <span className={dark ? 'text-[#CFCAC2]' : 'text-muted-ink'}> {yearly && plan.price_yearly ? (ar ? '/ سنوياً' : '/ year') : c.per_month}</span>
                                </div>
                                <ul className="flex flex-col gap-2.5 text-[15px]">
                                    {[limit(plan.max_branches, ['branch', 'branches'], ['فرع', 'فروع']), limit(plan.max_languages, ['language', 'languages'], ['لغة', 'لغات']), limit(plan.max_items, ['dish', 'dishes'], ['طبق', 'أطباق']), ...(plan.features ?? []).slice(0, 5).map((f) => featureLabels[f] ?? f)].map((line) => (
                                        <li key={line} className="flex items-start gap-2.5"><Check className={cn('mt-0.5 size-4 shrink-0', dark ? 'text-saffron' : 'text-forest')} />{line}</li>
                                    ))}
                                </ul>
                                <Link href={`/register?plan=${plan.id}`} className={cn('mt-auto flex h-12 items-center justify-center rounded-full font-bold transition-transform hover:-translate-y-0.5', dark ? 'bg-saffron text-ink' : 'border border-ink')}>
                                    {c.cta}{plan.trial_days ? ` · ${plan.trial_days} ${ar ? 'يوماً' : 'days free'}` : ''}
                                </Link>
                            </div>
                        );
                    })}
                </Reveal>
            </div>
        </section>
    );
}

function Faq({ c, lang }: { c: any; lang: Lang }) {
    return (
        <section className="grid gap-8 px-5 py-24 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-10 xl:px-16">
            <SplitHeading rtl={lang === 'ar'} className="font-display text-[clamp(32px,4.5vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em] lg:sticky lg:top-28 lg:self-start">{c.title}</SplitHeading>
            <Reveal stagger={0.06} className="max-w-[860px]">
                {(c.items ?? []).map((q: { q: string; a: string }, i: number) => (
                    <details key={i} open={i === 0} className="group border-t border-line py-5 last:border-b">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                            {q.q}
                            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong transition-transform group-open:rotate-45" aria-hidden>+</span>
                        </summary>
                        <p className="mt-3 max-w-[720px] leading-relaxed text-muted-ink">{q.a}</p>
                    </details>
                ))}
            </Reveal>
        </section>
    );
}

function Cta({ c, lang }: { c: any; lang: Lang }) {
    return (
        <section className="mb-20 px-5 sm:px-6 lg:px-10 xl:px-16">
            <Reveal className="flex flex-wrap items-center justify-between gap-6 rounded-[36px] bg-saffron px-8 py-16 md:px-12">
                <SplitHeading rtl={lang === 'ar'} className="max-w-[620px] font-display text-[clamp(32px,4.5vw,48px)] font-extrabold leading-[1.04] tracking-[-0.03em]">{c.title}</SplitHeading>
                <Link href="/register" className="inline-flex h-14 items-center rounded-full bg-ink px-8 text-[17px] font-bold text-white transition-transform hover:-translate-y-0.5">{c.button}</Link>
            </Reveal>
        </section>
    );
}
