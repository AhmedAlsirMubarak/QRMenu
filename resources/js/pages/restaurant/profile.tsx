import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { ImagePicker } from '@/components/menu/image-picker';
import { TranslatedInput } from '@/components/menu/translated-input';
import { Btn, Field, TextInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import type { LanguageOption, Translations } from '@/types';

type Props = {
    profile: {
        name: string;
        slug: string;
        tagline: Translations | null;
        phone: string | null;
        email: string | null;
        instagram_handle: string | null;
        google_review_url: string | null;
        google_rating: string | null;
        google_review_count: number | null;
        main_language: string;
        languages: string[];
        logo_url: string | null;
        cover_url: string | null;
    };
    options: { languages: Record<string, LanguageOption> };
    menuBaseUrl: string;
    marketplace: { listed: boolean; venue_type: string; cuisines: string[]; types: Record<string, string>; has_location: boolean };
};

export default function RestaurantProfile({
    profile,
    options,
    menuBaseUrl,
    marketplace,
}: Props) {
    const form = useForm({
        name: profile.name,
        slug: profile.slug,
        tagline: (profile.tagline ?? {}) as Translations,
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        instagram_handle: profile.instagram_handle ?? '',
        google_review_url: profile.google_review_url ?? '',
        google_rating: profile.google_rating ?? '',
        google_review_count: profile.google_review_count?.toString() ?? '',
        logo: null as File | null,
        cover: null as File | null,
        remove_logo: false,
        remove_cover: false,
    });
    const { data, setData, errors, processing } = form;
    const err = errors as Record<string, string | undefined>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/app/profile', {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title="Restaurant profile" />
            <PageHeader
                title="Restaurant profile"
                description="What guests see at the top of your menu, plus your Google review link."
            />

            <form onSubmit={submit} className="flex max-w-4xl flex-col gap-5">
                <section className="grid gap-4 rounded-2xl border border-line bg-white p-5 md:grid-cols-[200px_1fr]">
                    <ImagePicker
                        label="Logo"
                        aspect="aspect-square"
                        currentUrl={profile.logo_url}
                        file={data.logo}
                        removed={data.remove_logo}
                        onFile={(f) =>
                            setData((d) => ({
                                ...d,
                                logo: f,
                                remove_logo: false,
                            }))
                        }
                        onRemove={() => setData('remove_logo', true)}
                        error={errors.logo}
                    />
                    <ImagePicker
                        label="Cover photo"
                        aspect="aspect-[3/1]"
                        currentUrl={profile.cover_url}
                        file={data.cover}
                        removed={data.remove_cover}
                        onFile={(f) =>
                            setData((d) => ({
                                ...d,
                                cover: f,
                                remove_cover: false,
                            }))
                        }
                        onRemove={() => setData('remove_cover', true)}
                        error={errors.cover}
                    />
                </section>

                <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                    <h2 className="font-bold">Basics</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Restaurant name" error={errors.name}>
                            <TextInput
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field label="Menu link" error={errors.slug}>
                            <div className="flex items-center rounded-[10px] border border-line-strong bg-paper pl-3 text-sm text-muted-ink">
                                <span className="truncate">
                                    {menuBaseUrl.replace(/^https?:\/\//, '')}/
                                </span>
                                <TextInput
                                    className="min-w-0 flex-1 rounded-l-none border-0"
                                    value={data.slug}
                                    onChange={(e) =>
                                        setData(
                                            'slug',
                                            e.target.value.toLowerCase(),
                                        )
                                    }
                                    required
                                />
                            </div>
                            <span className="text-xs font-medium text-muted-ink">
                                Printed QR codes keep working if you change
                                this — only links you shared yourself change.
                            </span>
                        </Field>
                    </div>
                    <TranslatedInput
                        label="Short tagline (optional)"
                        value={data.tagline}
                        onChange={(v) => setData('tagline', v)}
                        languages={profile.languages}
                        mainLanguage="__none__"
                        languageInfo={options.languages}
                        errors={err}
                        errorKey="tagline"
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Phone" error={errors.phone}>
                            <TextInput
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Email" error={errors.email}>
                            <TextInput
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Instagram"
                            error={errors.instagram_handle}
                        >
                            <TextInput
                                placeholder="@yourrestaurant"
                                value={data.instagram_handle}
                                onChange={(e) =>
                                    setData('instagram_handle', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </section>

                <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                    <div>
                        <h2 className="font-bold">Google reviews</h2>
                        <p className="text-sm text-muted-ink">
                            Every guest sees a “Review us on Google” button —
                            regardless of the rating they give you.
                        </p>
                    </div>
                    <Field
                        label="Google review link"
                        error={errors.google_review_url}
                    >
                        <TextInput
                            type="url"
                            placeholder="https://g.page/r/…/review"
                            value={data.google_review_url}
                            onChange={(e) =>
                                setData('google_review_url', e.target.value)
                            }
                        />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Google rating shown on menu (e.g. 4.7)"
                            error={errors.google_rating}
                        >
                            <TextInput
                                inputMode="decimal"
                                value={data.google_rating}
                                onChange={(e) =>
                                    setData('google_rating', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Number of Google reviews"
                            error={errors.google_review_count}
                        >
                            <TextInput
                                inputMode="numeric"
                                value={data.google_review_count}
                                onChange={(e) =>
                                    setData(
                                        'google_review_count',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                </section>

                <Btn
                    type="submit"
                    variant="forest"
                    className="h-12 self-start px-8"
                    disabled={processing}
                >
                    {processing ? 'Saving…' : 'Save profile'}
                </Btn>
            </form>

            <MarketplaceSettings marketplace={marketplace} />
        </>
    );
}

function MarketplaceSettings({ marketplace }: { marketplace: Props['marketplace'] }) {
    const form = useForm({
        marketplace_listed: marketplace.listed,
        venue_type: marketplace.venue_type,
        cuisines: marketplace.cuisines.join(', '),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, cuisines: d.cuisines.split(',').map((c) => c.trim()).filter(Boolean) }));
        form.put('/app/profile/marketplace', { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="mt-6 flex max-w-4xl flex-col gap-4 rounded-2xl border border-line bg-white p-5">
            <div>
                <h2 className="font-bold">Marketplace</h2>
                <p className="text-sm text-muted-ink">
                    Appear on the public <a href="/marketplace" target="_blank" rel="noreferrer" className="font-semibold underline">Discover</a> page, where guests search restaurants by city, rating and distance.
                </p>
            </div>
            <label className="flex min-h-10 items-center gap-2.5 text-sm font-bold">
                <input type="checkbox" checked={form.data.marketplace_listed} onChange={(e) => form.setData('marketplace_listed', e.target.checked)} className="size-[18px] accent-forest" />
                List my restaurant on the Marketplace
            </label>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Type of place" error={form.errors.venue_type}>
                    <select value={form.data.venue_type} onChange={(e) => form.setData('venue_type', e.target.value)} className="h-[42px] rounded-[10px] border border-line-strong bg-white px-2.5 text-sm font-medium">
                        {Object.entries(marketplace.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </Field>
                <Field label="Cuisines (comma separated, up to 6)" error={form.errors.cuisines}>
                    <TextInput value={form.data.cuisines} onChange={(e) => form.setData('cuisines', e.target.value)} placeholder="Omani, Breakfast, Coffee" />
                </Field>
            </div>
            {!marketplace.has_location && (
                <p className="rounded-xl bg-saffron-soft px-3 py-2.5 text-sm">Add your branch location (latitude/longitude) in <a href="/app/branches" className="font-bold underline">Branches</a> so you appear in “Nearest” results.</p>
            )}
            <Btn type="submit" variant="forest" className="self-start" disabled={form.processing}>Save Marketplace settings</Btn>
        </form>
    );
}
