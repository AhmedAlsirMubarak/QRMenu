import { Head, Link, router, useForm } from '@inertiajs/react';
import { Camera, Check, Clock, EyeOff, Lock, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, CheckRow, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { PageHeader, StatCard } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';
import type { Paginated, Translations } from '@/types';

type Settings = {
    enabled: boolean;
    ask_after_photo: boolean;
    card_styles: string[];
    caption: Translations;
    reward_enabled: boolean;
    reward_text: Translations;
    reward_days: number;
    reward_limit: 'day' | 'week' | 'month';
    reward_daily_cap: number;
};

type Story = { id: number; status: 'pending' | 'approved' | 'hidden'; dish: string | null; before_url: string | null; after_url: string | null; shared: boolean; created_at: string; removes_at: string | null };

type Props = {
    settings: Settings;
    available: boolean;
    instagram: string | null;
    languages: string[];
    status: Story['status'];
    counts: Record<Story['status'], number>;
    stats: { created: number; shared: number; visits: number; redeemed: number };
    stories: Paginated<Story>;
    retention: { pending_days: number; hidden_days: number; keep_per_dish: number };
    dishes: { id: number; name: string | null }[];
};

const STYLES: Record<string, { label: string; swatch: string }> = {
    dark: { label: 'Dark', swatch: 'bg-ink' },
    saffron: { label: 'Saffron', swatch: 'bg-saffron' },
    minimal: { label: 'Minimal', swatch: 'bg-[#F1F0EC]' },
};

export default function PlateStoryAdmin({ settings, available, instagram, languages, status, counts, stats, stories, retention, dishes }: Props) {
    // Dish chosen by staff for photos the guest uploaded without one, keyed by story id.
    const [picked, setPicked] = useState<Record<number, string>>({});
    const approve = (story: Story) =>
        router.patch(`/app/plate-story/${story.id}`, { status: 'approved', menu_item_id: picked[story.id] ? Number(picked[story.id]) : null }, { preserveScroll: true, preserveState: true });
    const setStatus = (story: Story, next: Story['status']) => router.patch(`/app/plate-story/${story.id}`, { status: next }, { preserveScroll: true, preserveState: true });

    return (
        <>
            <Head title="Plate Story" />
            <PageHeader title="Plate Story" description="Guests share before/after photos of your dishes to Instagram — with your name on every story." />

            {!available && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl bg-saffron-soft p-4"><Lock className="mt-0.5 size-5" />Plate Story isn’t included in your current plan.</div>
            )}

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                <StatCard label="STORY CARDS · 30 DAYS" value={stats.created} />
                <StatCard label="SHARED" value={stats.shared} hint={stats.created ? `${Math.round((stats.shared / stats.created) * 100)}% of cards` : undefined} />
                <StatCard label="MENU VISITS FROM STORIES" value={stats.visits} />
                <StatCard label="REWARDS REDEEMED" value={stats.redeemed} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
                <div className="flex flex-col gap-5">
                    <SettingsForm settings={settings} languages={languages} instagram={instagram} />
                    <RedeemForm />
                </div>

                <section className="min-w-0 rounded-2xl border border-line bg-white p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-bold">Guest photos</h2>
                        <div role="tablist" aria-label="Photo status" className="ml-auto inline-flex rounded-xl bg-[#F1F0EC] p-1">
                            {(['pending', 'approved', 'hidden'] as const).map((s) => (
                                <Link key={s} href={`/app/plate-story?status=${s}`} preserveScroll role="tab" aria-selected={status === s} className={cn('h-9 rounded-lg px-3 text-sm font-bold leading-9', status === s ? 'bg-white shadow-sm' : 'text-muted-ink')}>
                                    {s === 'pending' ? 'To review' : s === 'approved' ? 'On menu' : 'Hidden'} · {counts[s]}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <p className="mb-3 text-sm text-muted-ink">Approved photos appear on that dish in your menu. Nothing shows without your approval.</p>
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-paper px-3.5 py-3 text-[13px] leading-relaxed text-muted-ink">
                        <Clock className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
                        <p>
                            <b className="text-ink">How long photos are kept:</b> photos waiting for review are removed after {retention.pending_days} days, hidden ones after {retention.hidden_days} days.
                            {' '}Your menu keeps the newest {retention.keep_per_dish} approved photos per dish — older ones are removed automatically. Your Plate Story statistics are never affected.
                        </p>
                    </div>

                    {stories.data.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-ink"><Camera className="size-8" />No photos here.</div>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3.5">
                        {stories.data.map((s) => (
                            <article key={s.id} className="overflow-hidden rounded-2xl border border-line">
                                <div className="relative flex h-36 gap-0.5 bg-paper">
                                    <RemovalBadge at={s.removes_at} />
                                    {s.before_url && <a href={s.before_url} target="_blank" rel="noreferrer" className="flex-1"><img src={s.before_url} alt="Before" className="size-full object-cover" /></a>}
                                    {s.after_url && <img src={s.after_url} alt="After" className="w-1/2 object-cover" />}
                                </div>
                                <div className="p-3">
                                    <div className="truncate text-sm font-bold">{s.dish ?? (picked[s.id] ? dishes.find((d) => String(d.id) === picked[s.id])?.name ?? 'Dish chosen' : 'No dish selected')}</div>
                                    <div className="text-xs text-muted-ink">{new Date(s.created_at).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{s.shared && ' · shared'}</div>
                                    {!s.dish && s.status !== 'approved' && (
                                        <SelectInput aria-label="Dish in this photo" value={picked[s.id] ?? ''} onChange={(e) => setPicked({ ...picked, [s.id]: e.target.value })} className="mt-2 h-9 text-[13px]">
                                            <option value="">Choose dish to approve…</option>
                                            {dishes.map((d) => <option key={d.id} value={d.id}>{d.name ?? `Dish #${d.id}`}</option>)}
                                        </SelectInput>
                                    )}
                                    <div className="mt-2.5 flex gap-1.5">
                                        {s.status !== 'approved' && <button type="button" onClick={() => approve(s)} disabled={!s.dish && !picked[s.id]} title={s.dish || picked[s.id] ? undefined : 'Choose the dish first — approved photos show on that dish'} className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-forest text-[13px] font-bold text-white disabled:opacity-40"><Check className="size-3.5" />Approve</button>}
                                        {s.status !== 'hidden' && <button type="button" onClick={() => setStatus(s, 'hidden')} className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-line-strong text-[13px] font-bold"><EyeOff className="size-3.5" />Hide</button>}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

function SettingsForm({ settings, languages, instagram }: { settings: Settings; languages: string[]; instagram: string | null }) {
    const form = useForm({ ...settings, caption: settings.caption ?? {}, reward_text: settings.reward_text ?? {}, reward_days: String(settings.reward_days), reward_daily_cap: String(settings.reward_daily_cap) });
    const { data, setData, errors } = form;
    const err = errors as Record<string, string | undefined>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, reward_days: Number(d.reward_days), reward_daily_cap: Number(d.reward_daily_cap) }));
        form.put('/app/plate-story/settings', { preserveScroll: true });
    };

    const toggleStyle = (style: string) =>
        setData('card_styles', data.card_styles.includes(style) ? data.card_styles.filter((s) => s !== style) : [...data.card_styles, style]);

    return (
        <form onSubmit={submit} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center">
                <h2 className="text-[17px] font-bold">Story card</h2>
                <label className="ml-auto flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" role="switch" checked={data.enabled} onChange={(e) => setData('enabled', e.target.checked)} className="size-5 accent-forest" />
                    {data.enabled ? 'On' : 'Off'}
                </label>
            </div>
            <p className="-mt-2 text-sm text-muted-ink">Cards show your name{instagram ? ` and @${instagram}` : ''}. {!instagram && <Link href="/app/profile" className="font-bold text-forest">Add your Instagram →</Link>}</p>

            <fieldset>
                <legend className="mb-2 text-[13px] font-bold">Card designs guests can pick</legend>
                <div className="flex gap-2">
                    {Object.entries(STYLES).map(([key, s]) => {
                        const on = data.card_styles.includes(key);
                        return (
                            <button key={key} type="button" aria-pressed={on} onClick={() => toggleStyle(key)} className={cn('flex flex-1 flex-col gap-1.5 rounded-xl p-1.5 text-xs font-bold', on ? 'border-2 border-forest' : 'border border-line')}>
                                <span className={cn('h-16 rounded-lg', s.swatch)} />
                                {s.label}{on && ' ✓'}
                            </button>
                        );
                    })}
                </div>
                {err.card_styles && <p className="mt-1 text-xs font-semibold text-clay">Pick at least one design.</p>}
            </fieldset>

            {languages.map((lang) => (
                <Field key={lang} label={`Caption on the card (${lang.toUpperCase()})`}>
                    <TextInput dir={lang === 'ar' ? 'rtl' : 'ltr'} value={data.caption[lang] ?? ''} onChange={(e) => setData('caption', { ...data.caption, [lang]: e.target.value })} />
                </Field>
            ))}
            <CheckRow checked={data.ask_after_photo} onChange={(v) => setData('ask_after_photo', v)}>Ask for an “after” photo (guests can skip)</CheckRow>

            <div className="mt-1 border-t border-[#F1F0EC] pt-4">
                <CheckRow checked={data.reward_enabled} onChange={(v) => setData('reward_enabled', v)}><b>Thank guests with a reward</b></CheckRow>
            </div>
            {data.reward_enabled && (
                <>
                    {languages.map((lang) => (
                        <Field key={lang} label={`Reward (${lang.toUpperCase()})`} error={lang === languages[0] ? err.reward_text : undefined}>
                            <TextInput dir={lang === 'ar' ? 'rtl' : 'ltr'} placeholder={lang === 'ar' ? 'كرك مجاني في زيارتك القادمة' : 'Free karak on your next visit'} value={data.reward_text[lang] ?? ''} onChange={(e) => setData('reward_text', { ...data.reward_text, [lang]: e.target.value })} />
                        </Field>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Valid for (days)" error={err.reward_days}>
                            <TextInput inputMode="numeric" value={data.reward_days} onChange={(e) => setData('reward_days', e.target.value)} />
                        </Field>
                        <Field label="Limit per guest">
                            <SelectInput value={data.reward_limit} onChange={(e) => setData('reward_limit', e.target.value as Settings['reward_limit'])}>
                                <option value="day">1 per day</option>
                                <option value="week">1 per week</option>
                                <option value="month">1 per month</option>
                            </SelectInput>
                        </Field>
                    </div>
                    <Field label="Max rewards per day" error={err.reward_daily_cap}>
                        <TextInput inputMode="numeric" value={data.reward_daily_cap} onChange={(e) => setData('reward_daily_cap', e.target.value)} />
                    </Field>
                    <p className="-mt-2 text-[13px] text-muted-ink">After this many codes in a day, guests can still share their photos but get no new code. It stops one person from collecting codes on many phones.</p>
                    <p className="rounded-xl bg-saffron-soft p-3 text-[13px] leading-snug text-muted-ink">Rewards are only for sharing on social media. They are never tied to Google reviews or star ratings — Google doesn’t allow rewarded reviews.</p>
                </>
            )}
            <Btn type="submit" variant="forest" disabled={form.processing}>Save settings</Btn>
        </form>
    );
}

type RewardCheck = { code: string; photo_url: string | null; dish: string | null; created_at: string };

/** Step 1: check the code and see the guest's photo. Step 2: confirm, which uses the code. */
function RedeemForm() {
    const form = useForm({ code: '', confirm: false });
    const [check, setCheck] = useState<RewardCheck | null>(null);

    useEffect(
        () =>
            router.on('flash', (event) => {
                const found = (event as CustomEvent).detail?.flash?.rewardCheck as RewardCheck | undefined;
                if (found) setCheck(found);
            }),
        [],
    );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setCheck(null);
        form.transform((data) => ({ ...data, confirm: false }));
        form.post('/app/plate-story/redeem', { preserveScroll: true });
    };

    const confirm = () => {
        if (!check) return;
        form.transform(() => ({ code: check.code, confirm: true }));
        form.post('/app/plate-story/redeem', { preserveScroll: true, onSuccess: () => { setCheck(null); form.reset(); } });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-2"><Ticket className="size-5" /><h2 className="text-[17px] font-bold">Check a reward code</h2></div>
            <p className="-mt-1 text-sm text-muted-ink">Type the code the guest shows you. You’ll see their photo before the code is used. Each code works once.</p>
            <div className="flex gap-2">
                <TextInput aria-label="Reward code" placeholder="ABC-123" value={form.data.code} onChange={(e) => { setCheck(null); form.setData('code', e.target.value.toUpperCase()); }} className="flex-1 font-mono uppercase tracking-wider" />
                <Btn type="submit" disabled={!form.data.code || form.processing}>Check</Btn>
            </div>
            {check && (
                <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-3">
                    <div className="flex gap-3">
                        {check.photo_url ? (
                            <img src={check.photo_url} alt={`Guest photo for code ${check.code}`} className="size-24 shrink-0 rounded-lg object-cover" />
                        ) : (
                            <span className="grid size-24 shrink-0 place-items-center rounded-lg bg-[#F1F0EC] text-muted-ink"><Camera className="size-6" /></span>
                        )}
                        <div className="min-w-0 text-sm">
                            <p className="font-mono font-bold tracking-wider">{check.code}</p>
                            {check.dish && <p className="font-semibold">{check.dish}</p>}
                            <p className="text-muted-ink">Uploaded {new Date(check.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            <p className="mt-1 text-[13px] text-muted-ink">Does this look like a real photo of your food?</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Btn type="button" variant="forest" onClick={confirm} disabled={form.processing}>Confirm redeem</Btn>
                        <Btn type="button" variant="outline" onClick={() => setCheck(null)}>Cancel</Btn>
                    </div>
                </div>
            )}
        </form>
    );
}

/** "Removed in 5 days" on waiting / hidden photos; turns red in the last 3 days. */
function RemovalBadge({ at }: { at: string | null }) {
    if (!at) return null;
    const days = Math.max(0, Math.ceil((new Date(at).getTime() - Date.now()) / 864e5));
    const label = days === 0 ? 'Removed tonight' : days === 1 ? 'Removed tomorrow' : `Removed in ${days} days`;

    return (
        <span
            className={cn('absolute start-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm', days <= 3 ? 'bg-clay text-white' : 'bg-white/95 text-ink')}
            title={new Date(at).toLocaleDateString('en', { dateStyle: 'medium' })}
        >
            <Clock className="size-3" aria-hidden />{label}
        </span>
    );
}
