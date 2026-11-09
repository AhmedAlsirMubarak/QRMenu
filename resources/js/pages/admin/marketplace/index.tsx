import { Head, router, useForm } from '@inertiajs/react';
import { ExternalLink, ImagePlus, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, CheckRow, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { Pager } from '@/components/platform/pager';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Paginated, Translations } from '@/types';

type Campaign = {
    id: number; advertiser_type: 'restaurant' | 'external'; restaurant_id: number | null; advertiser_name: string | null; advertiser: string;
    slot: string; priority: number; title: Translations; subtitle: Translations | null; image_url: string | null; link_url: string | null; city: string | null;
    starts_at: string; ends_at: string; price: string; currency: string; status: 'live' | 'scheduled' | 'ended' | 'paused';
    impressions: number; clicks: number; ctr: number | null; payment_id: number | null; payment_status: string | null;
    restaurant: { id: number; name: string; slug: string } | null;
};
type Props = {
    campaigns: Paginated<Campaign>;
    filters: { slot?: string; status?: string };
    slots: Record<string, string>;
    lineup: { slot: string; capacity: number | null; ads: { id: number; title: string; advertiser: string; priority: number; city: string | null; state: 'shown' | 'rotating' | 'waiting' }[] }[];
    kpis: { live: number; impressions: number; clicks: number; revenue_month: number; listed: number };
    restaurants: { id: number; name: string; marketplace_listed: boolean }[];
    currency: string;
    cities: string[];
};

const STATUS_CLS: Record<string, string> = {
    live: 'bg-mint text-forest', scheduled: 'bg-saffron-soft text-ink', ended: 'bg-[#F1F0EC] text-muted-ink', paused: 'bg-clay-soft text-clay',
};
const IMAGE_HINTS: Record<string, { size: string; aspect: string; note: string }> = {
    banner: { size: '1600 × 500 px', aspect: 'aspect-[16/5]', note: 'Wide strip across the top of the page. Keep text away from the edges.' },
    sidebar: { size: '800 × 500 px', aspect: 'aspect-[16/10]', note: 'Shown at the top of the side ad.' },
    sponsored: { size: '1200 × 700 px', aspect: 'aspect-[12/7]', note: 'Replaces the restaurant’s cover photo on its pinned card.' },
    offer: { size: '1200 × 700 px', aspect: 'aspect-[12/7]', note: 'Replaces the restaurant’s cover photo on its card while the offer runs.' },
};
const day = (d: string) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
const toInput = (d: string) => d.slice(0, 10);

export default function MarketplaceAdmin({ campaigns, filters, slots, lineup, kpis, restaurants, currency, cities }: Props) {
    const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
    const apply = (next: Record<string, string>) => router.get('/admin/marketplace', { ...filters, ...next }, { preserveState: true, replace: true });
    const ctr = kpis.impressions ? ((kpis.clicks / kpis.impressions) * 100).toFixed(1) : '0.0';

    return (
        <>
            <Head title="Marketplace & ads" />
            <PageHeader
                title="Marketplace & ads"
                description="Paid placements on the public Discover page. Restaurants opt in to be listed from their Profile."
                actions={
                    <>
                        <a href="/marketplace" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold">View page <ExternalLink className="size-4" /></a>
                        <Btn onClick={() => setEditing('new')}><Plus className="size-4" />New campaign</Btn>
                    </>
                }
            />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                <StatCard tone="dark" label="AD REVENUE THIS MONTH" value={formatMoney(kpis.revenue_month, currency)} hint="Paid advertising invoices" />
                <StatCard label="LIVE CAMPAIGNS" value={kpis.live} />
                <StatCard label="IMPRESSIONS (LIVE)" value={kpis.impressions.toLocaleString()} />
                <StatCard label="CLICKS (LIVE)" value={kpis.clicks.toLocaleString()} hint={`${ctr}% click-through`} />
                <StatCard label="LISTED RESTAURANTS" value={kpis.listed} />
            </div>

            <Lineup lineup={lineup} slots={slots} onEdit={(id) => setEditing(campaigns.data.find((c) => c.id === id) ?? null)} />

            <div className="mb-3 flex flex-wrap gap-2">
                <SelectInput aria-label="Slot" value={filters.slot ?? ''} onChange={(e) => apply({ slot: e.target.value })}>
                    <option value="">All placements</option>
                    {Object.entries(slots).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectInput>
                <SelectInput aria-label="Status" value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value })}>
                    <option value="">Any status</option>
                    {['live', 'scheduled', 'paused', 'ended'].map((s) => <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>)}
                </SelectInput>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-paper text-xs font-bold text-muted-ink">
                        <tr>
                            <th className="px-4 py-2.5 text-start">Campaign</th><th className="px-4 py-2.5 text-start">Placement</th><th className="px-4 py-2.5 text-center">Priority</th><th className="px-4 py-2.5 text-start">Dates</th>
                            <th className="px-4 py-2.5 text-end">Impr.</th><th className="px-4 py-2.5 text-end">Clicks</th><th className="px-4 py-2.5 text-end">Price</th><th className="px-4 py-2.5 text-start">Status</th><th className="px-4 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {campaigns.data.map((c) => (
                            <tr key={c.id}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {c.image_url ? <img src={c.image_url} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-sand" />}
                                        <span className="min-w-0">
                                            <span className="block max-w-[260px] truncate font-bold">{c.title.en}</span>
                                            <span className="block text-muted-ink">{c.advertiser}{c.city ? ` · ${c.city}` : ''}</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{slots[c.slot]?.split(' (')[0]}</td>
                                <td className="px-4 py-3 text-center"><span className="inline-grid size-8 place-items-center rounded-full bg-sand font-extrabold tabular-nums">{c.priority}</span></td>
                                <td className="whitespace-nowrap px-4 py-3 text-muted-ink">{day(c.starts_at)} – {day(c.ends_at)}</td>
                                <td className="px-4 py-3 text-end tabular-nums">{c.impressions.toLocaleString()}</td>
                                <td className="px-4 py-3 text-end tabular-nums">{c.clicks.toLocaleString()}{c.ctr !== null && <span className="block text-xs text-muted-ink">{c.ctr}%</span>}</td>
                                <td className="px-4 py-3 text-end tabular-nums">
                                    {formatMoney(c.price, c.currency)}
                                    {c.payment_status && <span className={cn('block text-xs font-bold capitalize', c.payment_status === 'paid' ? 'text-forest' : 'text-clay')}>{c.payment_status}</span>}
                                </td>
                                <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold capitalize', STATUS_CLS[c.status])}>{c.status}</span></td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        {c.status !== 'ended' && (
                                            <button type="button" onClick={() => router.post(`/admin/marketplace/ads/${c.id}`, { is_paused: c.status !== 'paused' }, { preserveScroll: true })} className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label={c.status === 'paused' ? 'Resume' : 'Pause'} title={c.status === 'paused' ? 'Resume' : 'Pause'}>
                                                {c.status === 'paused' ? <Play className="size-4" /> : <Pause className="size-4" />}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setEditing(c)} className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label={`Edit ${c.title.en}`}><Pencil className="size-4" /></button>
                                        <button type="button" onClick={() => window.confirm(`Delete “${c.title.en}”?`) && router.delete(`/admin/marketplace/ads/${c.id}`, { preserveScroll: true })} className="grid size-9 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label={`Delete ${c.title.en}`}><Trash2 className="size-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {campaigns.data.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-ink">No campaigns yet. Create one to sell a banner, a sponsored listing, a sidebar ad or an offer badge.</td></tr>}
                    </tbody>
                </table>
            </div>
            <Pager page={campaigns} />

            <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto bg-white sm:max-w-2xl">
                    {editing && <CampaignForm key={editing === 'new' ? 'new' : editing.id} campaign={editing === 'new' ? null : editing} slots={slots} restaurants={restaurants} cities={cities} currency={currency} onDone={() => setEditing(null)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

function CampaignForm({ campaign, slots, restaurants, cities, currency, onDone }: { campaign: Campaign | null; slots: Props['slots']; restaurants: Props['restaurants']; cities: string[]; currency: string; onDone: () => void }) {
    const today = new Date().toISOString().slice(0, 10);
    const inMonth = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const form = useForm({
        advertiser_type: campaign?.advertiser_type ?? 'restaurant',
        restaurant_id: campaign?.restaurant_id ? String(campaign.restaurant_id) : '',
        advertiser_name: campaign?.advertiser_name ?? '',
        slot: campaign?.slot ?? 'sponsored',
        title: { en: campaign?.title.en ?? '', ar: campaign?.title.ar ?? '' },
        subtitle: { en: campaign?.subtitle?.en ?? '', ar: campaign?.subtitle?.ar ?? '' },
        image: null as File | null,
        remove_image: false,
        link_url: campaign?.link_url ?? '',
        city: campaign?.city ?? '',
        starts_at: campaign ? toInput(campaign.starts_at) : today,
        ends_at: campaign ? toInput(campaign.ends_at) : inMonth,
        price: campaign?.price ?? '',
        currency: campaign?.currency ?? currency,
        priority: String(campaign?.priority ?? 5),
        record_payment: !campaign,
        payment_status: 'pending',
    });
    const err = form.errors as Record<string, string | undefined>;
    const restaurantOnly = form.data.slot === 'sponsored' || form.data.slot === 'offer';
    const external = form.data.advertiser_type === 'external' && !restaurantOnly;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, advertiser_type: restaurantOnly ? 'restaurant' : d.advertiser_type }));
        form.post(campaign ? `/admin/marketplace/ads/${campaign.id}` : '/admin/marketplace/ads', { forceFormData: true, preserveScroll: true, onSuccess: onDone });
    };

    const selectedRestaurant = restaurants.find((r) => String(r.id) === form.data.restaurant_id);

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">{campaign ? 'Edit campaign' : 'New campaign'}</DialogTitle>
                <DialogDescription>Shown on the Discover page between the dates below.</DialogDescription>
            </DialogHeader>

            <Field label="Placement" error={err.slot}>
                <SelectInput value={form.data.slot} onChange={(e) => form.setData('slot', e.target.value)}>
                    {Object.entries(slots).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectInput>
            </Field>

            {!restaurantOnly && (
                <div role="radiogroup" aria-label="Advertiser" className="flex gap-2">
                    {(['restaurant', 'external'] as const).map((t) => (
                        <button key={t} type="button" role="radio" aria-checked={form.data.advertiser_type === t} onClick={() => form.setData('advertiser_type', t)} className={cn('h-10 flex-1 rounded-xl text-sm font-bold', form.data.advertiser_type === t ? 'bg-ink text-white' : 'border border-line-strong')}>
                            {t === 'restaurant' ? 'A restaurant on the platform' : 'External company'}
                        </button>
                    ))}
                </div>
            )}

            {external ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Advertiser name" error={err.advertiser_name}><TextInput value={form.data.advertiser_name} onChange={(e) => form.setData('advertiser_name', e.target.value)} /></Field>
                    <Field label="Link (https://…)" error={err.link_url}><TextInput type="url" value={form.data.link_url} onChange={(e) => form.setData('link_url', e.target.value)} /></Field>
                </div>
            ) : (
                <Field label="Restaurant" error={err.restaurant_id}>
                    <SelectInput value={form.data.restaurant_id} onChange={(e) => form.setData('restaurant_id', e.target.value)}>
                        <option value="">Choose…</option>
                        {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}{r.marketplace_listed ? '' : ' (not listed)'}</option>)}
                    </SelectInput>
                    {restaurantOnly && selectedRestaurant && !selectedRestaurant.marketplace_listed && (
                        <span className="text-xs font-semibold text-clay">This restaurant isn’t listed on the Marketplace, so a {form.data.slot === 'offer' ? 'badge' : 'sponsored card'} won’t show until they opt in from their Profile.</span>
                    )}
                </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label={form.data.slot === 'offer' ? 'Offer (English) — e.g. “20% off breakfast”' : 'Title (English)'} error={err['title.en']}>
                    <TextInput value={form.data.title.en} onChange={(e) => form.setData('title', { ...form.data.title, en: e.target.value })} maxLength={80} />
                </Field>
                <Field label="العنوان (عربي)" error={err['title.ar']}>
                    <TextInput dir="rtl" className="font-arabic" value={form.data.title.ar} onChange={(e) => form.setData('title', { ...form.data.title, ar: e.target.value })} maxLength={80} />
                </Field>
                {form.data.slot !== 'offer' && form.data.slot !== 'sponsored' && (
                    <>
                        <Field label="Subtitle (English)" error={err['subtitle.en']}><TextInput value={form.data.subtitle.en} onChange={(e) => form.setData('subtitle', { ...form.data.subtitle, en: e.target.value })} maxLength={160} /></Field>
                        <Field label="النص (عربي)" error={err['subtitle.ar']}><TextInput dir="rtl" className="font-arabic" value={form.data.subtitle.ar} onChange={(e) => form.setData('subtitle', { ...form.data.subtitle, ar: e.target.value })} maxLength={160} /></Field>
                    </>
                )}
            </div>

            <CampaignImage
                slot={form.data.slot}
                current={form.data.remove_image ? null : (campaign?.image_url ?? null)}
                file={form.data.image}
                error={err.image}
                onFile={(f) => form.setData({ ...form.data, image: f, remove_image: false })}
                onRemove={() => form.setData({ ...form.data, image: null, remove_image: Boolean(campaign?.image_url) })}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <Field label="City (empty = everywhere)" error={err.city}>
                    <SelectInput value={form.data.city} onChange={(e) => form.setData('city', e.target.value)}>
                        <option value="">Everywhere</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </SelectInput>
                </Field>
                <Field label="Starts" error={err.starts_at}><TextInput type="date" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} /></Field>
                <Field label="Ends" error={err.ends_at}><TextInput type="date" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} /></Field>
            </div>

            <Field label="Priority — who shows first" error={err.priority}>
                <SelectInput value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)}>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((p) => (
                        <option key={p} value={p}>{p}{p === 10 ? ' — highest, always first' : p === 5 ? ' — normal' : p === 1 ? ' — lowest' : ''}</option>
                    ))}
                </SelectInput>
                <span className="text-xs font-medium text-muted-ink">Higher numbers show first in this placement. Campaigns with the same priority take turns on each visit.</span>
            </Field>

            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Price" error={err.price}><TextInput inputMode="decimal" value={form.data.price} onChange={(e) => form.setData('price', e.target.value)} placeholder="0.000" /></Field>
                <Field label="Currency" error={err.currency}>
                    <SelectInput value={form.data.currency} onChange={(e) => form.setData('currency', e.target.value)}>
                        {['OMR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'USD'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </SelectInput>
                </Field>
            </div>

            {!campaign?.payment_id && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3">
                    <CheckRow checked={form.data.record_payment} onChange={(v) => form.setData('record_payment', v)}>Create an advertising invoice in Finance</CheckRow>
                    {form.data.record_payment && (
                        <SelectInput aria-label="Invoice status" value={form.data.payment_status} onChange={(e) => form.setData('payment_status', e.target.value)} className="ms-auto">
                            <option value="pending">Unpaid (pending)</option>
                            <option value="paid">Already paid</option>
                        </SelectInput>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                <Btn variant="outline" onClick={onDone}>Cancel</Btn>
                <Btn type="submit" variant="forest" className="flex-1" disabled={form.processing}>{campaign ? 'Save campaign' : 'Create campaign'}</Btn>
            </div>
        </form>
    );
}

function CampaignImage({ slot, current, file, error, onFile, onRemove }: { slot: string; current: string | null; file: File | null; error?: string; onFile: (f: File) => void; onRemove: () => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const hint = IMAGE_HINTS[slot] ?? IMAGE_HINTS.sidebar;

    useEffect(() => {
        if (!file) return setPreview(null);
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? current;
    const fallback = slot === 'sponsored' || slot === 'offer' || slot === 'sidebar' ? 'Without an image, the restaurant’s cover photo is used.' : 'Without an image, a branded colour background is used.';

    return (
        <div className="flex flex-col gap-1.5 text-[13px] font-bold">
            <span>Campaign image <span className="font-medium text-muted-ink">— optional · {hint.size} · JPG, PNG or WebP, max 4 MB</span></span>
            <button
                type="button"
                onClick={() => input.current?.click()}
                className={cn('relative w-full overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-paper transition-colors hover:border-forest', hint.aspect, slot === 'banner' ? 'max-h-40' : 'max-h-56')}
                aria-label={shown ? 'Change campaign image' : 'Upload campaign image'}
            >
                {shown ? (
                    <img src={shown} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center text-muted-ink">
                        <ImagePlus className="size-6" />
                        <span className="text-sm font-bold text-ink">Upload the client’s artwork</span>
                        <span className="text-xs font-medium">{fallback}</span>
                    </span>
                )}
                {shown && <span className="absolute bottom-2 end-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink">Change</span>}
            </button>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
            <span className="text-xs font-medium text-muted-ink">{hint.note}</span>
            {shown && <button type="button" onClick={onRemove} className="self-start text-xs font-bold text-clay underline">Remove image</button>}
            {error && <span className="text-xs font-semibold text-clay">{error}</span>}
        </div>
    );
}

const STATE: Record<string, { label: string; cls: string }> = {
    shown: { label: 'Showing', cls: 'bg-mint text-forest' },
    rotating: { label: 'Taking turns', cls: 'bg-saffron-soft text-ink' },
    waiting: { label: 'Waiting', cls: 'bg-[#F1F0EC] text-muted-ink' },
};

/** What guests see now, per placement, in priority order. */
function Lineup({ lineup, slots, onEdit }: { lineup: Props['lineup']; slots: Props['slots']; onEdit: (id: number) => void }) {
    if (lineup.every((l) => l.ads.length === 0)) return null;

    return (
        <section aria-label="Live order" className="mb-5 rounded-2xl border border-line bg-white p-4">
            <h2 className="font-bold">Live now — who shows first</h2>
            <p className="mb-3 text-sm text-muted-ink">Ordered by priority. When more campaigns share a placement than it has room for, equal priorities take turns and lower ones wait.</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {lineup.map((l) => (
                    <div key={l.slot} className="rounded-xl bg-paper p-3">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                            <span className="text-sm font-extrabold">{slots[l.slot]?.split(' (')[0]}</span>
                            <span className="text-xs font-semibold text-muted-ink">{l.capacity === null ? '1 per restaurant' : `${l.capacity} at a time`}</span>
                        </div>
                        {l.ads.length === 0 ? (
                            <p className="text-xs text-muted-ink">Nothing live.</p>
                        ) : (
                            <ol className="flex flex-col gap-1.5">
                                {l.ads.map((a, i) => (
                                    <li key={a.id}>
                                        <button type="button" onClick={() => onEdit(a.id)} className="flex w-full items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-start text-sm hover:ring-1 hover:ring-line-strong">
                                            <span className="w-4 shrink-0 text-xs font-bold text-muted-ink tabular-nums">{i + 1}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-bold">{a.title}</span>
                                                <span className="block truncate text-xs text-muted-ink">{a.advertiser}{a.city ? ` · ${a.city}` : ''} · P{a.priority}</span>
                                            </span>
                                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', STATE[a.state].cls)}>{STATE[a.state].label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
