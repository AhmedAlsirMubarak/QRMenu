import { router } from '@inertiajs/react';
import { copyText } from '@/lib/clipboard';
import { Check, Copy, ExternalLink, MapPin, Phone, Star, Wifi } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BottomSheet } from '@/components/public-menu/bottom-sheet';
import type { Strings } from '@/components/public-menu/strings';
import { tagLabel } from '@/components/public-menu/strings';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

export type GuestItem = {
    id: number;
    name: Translations;
    description: Translations | null;
    price: string;
    compare_at_price: string | null;
    image_url: string | null;
    is_available: boolean;
    is_featured: boolean;
    dietary_tags: string[];
    allergens: string[];
    calories: number | null;
    options: { id: number; type: 'size' | 'extra'; name: Translations; price: string }[];
    guest_photos?: string[];
};

export type GuestBranch = {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    area: string | null;
    address: string | null;
    phone: string | null;
    wifi_name: string | null;
    wifi_password: string | null;
    map_url: string | null;
};

type Text = (value: Translations | null | undefined) => string;

export function ItemSheet({ item, onClose, t, text, price, lang }: { item: GuestItem | null; onClose: () => void; t: Strings; text: Text; price: (v: string) => string; lang: string }) {
    const sizes = item?.options.filter((o) => o.type === 'size') ?? [];
    const extras = item?.options.filter((o) => o.type === 'extra') ?? [];

    return (
        <BottomSheet open={item !== null} onClose={onClose} label={item ? text(item.name) : ''} closeLabel={t.close}>
            {item && (
                <div>
                    {item.image_url ? (
                        <img src={item.image_url} alt={text(item.name)} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                        <div className="h-14" />
                    )}
                    <div className="flex flex-col gap-4 p-5">
                        <div>
                            <h2 className="font-display text-2xl font-extrabold leading-tight">{text(item.name)}</h2>
                            {text(item.description) && <p className="mt-1.5 leading-relaxed text-[var(--muted)]">{text(item.description)}</p>}
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-extrabold">{sizes.length ? `${t.from} ${price(minPrice(item.price, sizes))}` : price(item.price)}</span>
                            {item.compare_at_price && <span className="text-[var(--muted)] line-through">{price(item.compare_at_price)}</span>}
                            {!item.is_available && <span className="ms-auto rounded-full bg-[var(--chip)] px-3 py-1 text-sm font-bold text-[var(--bad)]">{t.soldOut}</span>}
                        </div>

                        {sizes.length > 0 && <OptionList title={t.sizes} options={sizes} text={text} price={price} />}
                        {extras.length > 0 && <OptionList title={t.extras} options={extras} text={text} price={(v) => `+ ${price(v)}`} />}

                        {(item.guest_photos?.length ?? 0) > 0 && (
                            <div>
                                <h3 className="mb-1.5 text-sm font-bold text-[var(--muted)]">{lang === 'ar' ? 'صور الضيوف' : 'Guest photos'}</h3>
                                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
                                    {item.guest_photos?.map((url) => <img key={url} src={url} alt="" loading="lazy" className="size-24 shrink-0 rounded-xl object-cover" />)}
                                </div>
                            </div>
                        )}

                        {(item.dietary_tags.length > 0 || item.allergens.length > 0 || item.calories) && (
                            <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
                                {item.dietary_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.dietary_tags.map((tag) => (
                                            <span key={tag} className="rounded-full bg-[var(--good-bg)] px-2.5 py-1 text-xs font-bold text-[var(--good)]">{tagLabel(tag, lang)}</span>
                                        ))}
                                    </div>
                                )}
                                {item.allergens.length > 0 && (
                                    <p className="text-sm"><b>{t.allergens}:</b> {item.allergens.map((a) => tagLabel(a, lang)).join(lang === 'ar' ? '، ' : ', ')}</p>
                                )}
                                {item.calories && <p className="text-sm text-[var(--muted)]">{item.calories} {t.calories}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </BottomSheet>
    );
}

function minPrice(base: string, sizes: { price: string }[]): string {
    return String(Math.min(Number(base), ...sizes.map((s) => Number(s.price))));
}

function OptionList({ title, options, text, price }: { title: string; options: GuestItem['options']; text: Text; price: (v: string) => string }) {
    return (
        <div>
            <h3 className="mb-1.5 text-sm font-bold text-[var(--muted)]">{title}</h3>
            <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
                {options.map((o) => (
                    <li key={o.id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-semibold">{text(o.name)}</span>
                        <span className="font-bold">{price(o.price)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function InfoSheet({ open, onClose, t, branch, branches, phone, instagram, slug }: { open: boolean; onClose: () => void; t: Strings; branch: GuestBranch; branches: { id: number; name: string; slug: string; area: string | null }[]; phone: string | null; instagram: string | null; slug: string }) {
    const [copied, setCopied] = useState(false);
    const callNumber = branch.phone || phone;

    return (
        <BottomSheet open={open} onClose={onClose} label={t.info} closeLabel={t.close}>
            <div className="flex flex-col gap-4 p-5 pt-6">
                <h2 className="font-display text-2xl font-extrabold">{branch.name}</h2>

                {(branch.address || branch.area || branch.city) && (
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-5 shrink-0" />
                        <div className="flex-1">{[branch.address, branch.area, branch.city].filter(Boolean).join(', ')}</div>
                        {branch.map_url && (
                            <a href={branch.map_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--chip)] px-3 text-sm font-bold">{t.directions}<ExternalLink className="size-3.5" /></a>
                        )}
                    </div>
                )}

                {callNumber && (
                    <a href={`tel:${callNumber.replace(/\s+/g, '')}`} className="flex items-center gap-3"><Phone className="size-5" /><span dir="ltr">{callNumber}</span></a>
                )}

                {branch.wifi_name && (
                    <div className="flex items-center gap-3 rounded-2xl bg-[var(--chip)] p-3.5">
                        <Wifi className="size-5 shrink-0" />
                        <div className="min-w-0 flex-1 text-sm">
                            <div><b>{t.wifi}:</b> <span dir="ltr">{branch.wifi_name}</span></div>
                            {branch.wifi_password && <div><b>{t.password}:</b> <span dir="ltr" className="font-mono">{branch.wifi_password}</span></div>}
                        </div>
                        {branch.wifi_password && (
                            <button
                                type="button"
                                onClick={async () => { if (await copyText(branch.wifi_password ?? '')) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
                                className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--surface)] px-3 text-sm font-bold"
                            >
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? t.copied : t.copy}
                            </button>
                        )}
                    </div>
                )}

                {instagram && (
                    <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 font-semibold">
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
                        <span dir="ltr">@{instagram}</span>
                    </a>
                )}

                {branches.length > 1 && (
                    <div className="border-t border-[var(--line)] pt-4">
                        <h3 className="mb-2 text-sm font-bold text-[var(--muted)]">{t.branches}</h3>
                        <div className="flex flex-wrap gap-2">
                            {branches.map((b) => (
                                <a
                                    key={b.id}
                                    href={`/${slug}?branch=${b.slug}`}
                                    className={cn('inline-flex h-10 items-center rounded-full px-4 text-sm font-bold', b.id === branch.id ? 'bg-[var(--active)] text-[var(--active-ink)]' : 'bg-[var(--chip)]')}
                                    aria-current={b.id === branch.id ? 'true' : undefined}
                                >
                                    {b.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

type Ratings = { food_rating: number; service_rating: number; cleanliness_rating: number; overall_rating: number };

export function FeedbackSheet({ open, onClose, t, slug, branchId, lang, google, onReviewClick }: { open: boolean; onClose: () => void; t: Strings; slug: string; branchId: number; lang: string; google: { rating: number | null; url: string | null }; onReviewClick: () => void }) {
    const [ratings, setRatings] = useState<Ratings>({ food_rating: 0, service_rating: 0, cleanliness_rating: 0, overall_rating: 0 });
    const [comment, setComment] = useState('');
    const [anonymous, setAnonymous] = useState(true);
    const [contact, setContact] = useState('');
    const [website, setWebsite] = useState(''); // honeypot
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState<string | null>(null);

    const rows: [keyof Ratings, string][] = [
        ['food_rating', t.food],
        ['service_rating', t.service],
        ['cleanliness_rating', t.cleanliness],
        ['overall_rating', t.overall],
    ];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!ratings.overall_rating) {
            setError(t.ratingRequired);
            return;
        }
        setError(null);
        setState('sending');
        const payload = Object.fromEntries(Object.entries(ratings).map(([k, v]) => [k, v || null]));
        router.post(
            `/${slug}/feedback`,
            { ...payload, branch_id: branchId, comment, is_anonymous: anonymous, contact: anonymous ? null : contact, locale: lang, website },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setState('sent'),
                onError: () => { setState('idle'); setError(t.ratingRequired); },
            },
        );
    };

    return (
        <BottomSheet open={open} onClose={onClose} label={t.howWasIt} closeLabel={t.close}>
            <div className="flex flex-col gap-4 p-5 pt-6">
                {state === 'sent' ? (
                    <div className="py-4 text-center">
                        <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-[var(--good-bg)]"><Check className="size-8 text-[var(--good)]" /></div>
                        <h2 className="font-display text-2xl font-extrabold">{t.thanks}</h2>
                        <p className="text-[var(--muted)]">{t.thanksText}</p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <div>
                            <h2 className="font-display text-2xl font-extrabold">{t.howWasIt}</h2>
                            <p className="text-sm text-[var(--muted)]">{t.goesToManager}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--line)] px-4">
                            {rows.map(([key, label], i) => (
                                <div key={key} className={cn('flex items-center justify-between py-2.5', i < rows.length - 1 && 'border-b border-[var(--line)]')}>
                                    <span className="text-[15px] font-semibold">{label}{key === 'overall_rating' && <span className="text-[var(--bad)]"> *</span>}</span>
                                    <div role="radiogroup" aria-label={label} className="flex">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                role="radio"
                                                aria-checked={ratings[key] === n}
                                                aria-label={`${n} ${t.outOf}`}
                                                onClick={() => setRatings((r) => ({ ...r, [key]: n }))}
                                                className="grid h-11 w-8 place-items-center"
                                            >
                                                <Star className={cn('size-6', n <= ratings[key] ? 'fill-[#F2B33D] text-[#C98A12]' : 'text-[var(--muted)] opacity-50')} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            {t.commentLabel}
                            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.commentPlaceholder} maxLength={1000} className="resize-none rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-3 text-[15px] font-normal outline-none focus:border-[var(--ink)]" />
                        </label>
                        <label className="flex min-h-11 items-center gap-3 text-sm">
                            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-5 accent-[var(--good)]" />
                            {t.anonymous}
                        </label>
                        {!anonymous && (
                            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.contact} aria-label={t.contact} className="h-12 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-3.5 outline-none focus:border-[var(--ink)]" />
                        )}
                        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" name="website" />
                        {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}
                        <button type="submit" disabled={state === 'sending'} className="h-14 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)] disabled:opacity-60">
                            {state === 'sending' ? t.sending : t.send}
                        </button>
                    </form>
                )}

                {/* Shown to every guest regardless of rating — never gate public reviews. */}
                {google.url && (
                    <div className="flex flex-col gap-2.5 rounded-2xl bg-[var(--chip)] p-4">
                        {google.rating && (
                            <div className="flex items-center gap-2">
                                <span className="font-display text-3xl font-extrabold">{google.rating.toFixed(1)}</span>
                                <Stars value={google.rating} />
                                <span className="text-sm text-[var(--muted)]">{t.googleReviews}</span>
                            </div>
                        )}
                        <div className="font-semibold">{t.publicReview}</div>
                        <a href={google.url} target="_blank" rel="noreferrer" onClick={onReviewClick} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--surface)] font-bold">
                            {t.reviewGoogle} <ExternalLink className="size-4" />
                        </a>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

export function Stars({ value }: { value: number }) {
    return (
        <span className="flex" dir="ltr" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('size-4', n <= Math.round(value) ? 'fill-[#F2B33D] text-[#C98A12]' : 'text-[var(--muted)] opacity-40')} />
            ))}
        </span>
    );
}
