import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { BrandMark } from '@/components/platform/brand-mark';
import {
    Btn,
    Field,
    SelectInput,
    TextInput,
} from '@/components/platform/fields';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

type Props = {
    languages: Record<string, { name: string; native: string; dir: string }>;
    currencies: Record<
        string,
        { name: string; symbol: string; decimals: number }
    >;
    plans: {
        id: number;
        name: Translations;
        price_monthly: string;
        currency: string;
        trial_days: number;
    }[];
    chosenPlanId: number | null;
};

export default function Onboarding({ languages, currencies, plans, chosenPlanId }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        main_language: 'en',
        languages: ['ar'] as string[],
        currency: 'OMR',
        city: '',
        phone: '',
        plan_id:
            chosenPlanId ??
            plans.find((p) => p.price_monthly)?.id ??
            (null as number | null),
    });

    const toggleLanguage = (code: string) =>
        setData(
            'languages',
            data.languages.includes(code)
                ? data.languages.filter((l) => l !== code)
                : [...data.languages, code],
        );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/onboarding');
    };

    return (
        <div className="min-h-svh bg-paper px-4 py-10 text-ink">
            <Head title="Set up your restaurant" />
            <div className="mx-auto max-w-2xl">
                <BrandMark />
                <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Let’s set up your menu
                </h1>
                <p className="mt-2 text-lg text-muted-ink">
                    Takes a minute. You can change everything later.
                </p>

                <form
                    onSubmit={submit}
                    className="mt-8 flex flex-col gap-5 rounded-3xl border border-line bg-white p-6"
                >
                    <Field label="Restaurant or café name" error={errors.name}>
                        <TextInput
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoFocus
                            placeholder="Bait Al Saffron"
                        />
                    </Field>
                    <Field
                        label={
                            <span>
                                Menu link{' '}
                                <span className="font-medium text-muted-ink">
                                    (optional — we’ll make one from the name)
                                </span>
                            </span>
                        }
                        error={errors.slug}
                    >
                        <div className="flex items-center rounded-[10px] border border-line-strong bg-paper pl-3 text-sm text-muted-ink">
                            {window.location.host}/
                            <TextInput
                                className="flex-1 rounded-l-none border-0"
                                value={data.slug}
                                onChange={(e) =>
                                    setData(
                                        'slug',
                                        e.target.value.toLowerCase(),
                                    )
                                }
                                placeholder="bait-al-saffron"
                            />
                        </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Main menu language"
                            error={errors.main_language}
                        >
                            <SelectInput
                                value={data.main_language}
                                onChange={(e) =>
                                    setData('main_language', e.target.value)
                                }
                            >
                                {Object.entries(languages).map(([code, l]) => (
                                    <option key={code} value={code}>
                                        {l.name} — {l.native}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field label="Currency" error={errors.currency}>
                            <SelectInput
                                value={data.currency}
                                onChange={(e) =>
                                    setData('currency', e.target.value)
                                }
                            >
                                {Object.entries(currencies).map(([code, c]) => (
                                    <option key={code} value={code}>
                                        {code} — {c.name}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>
                    </div>

                    <fieldset>
                        <legend className="mb-2 text-[13px] font-bold">
                            Other languages guests can switch to
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(languages)
                                .filter(([code]) => code !== data.main_language)
                                .map(([code, l]) => {
                                    const on = data.languages.includes(code);
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggleLanguage(code)}
                                            className={cn(
                                                'h-10 rounded-full px-4 text-sm font-bold',
                                                on
                                                    ? 'bg-ink text-white'
                                                    : 'border border-line-strong bg-white',
                                            )}
                                        >
                                            {l.native}
                                        </button>
                                    );
                                })}
                        </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="City" error={errors.city}>
                            <TextInput
                                value={data.city}
                                onChange={(e) =>
                                    setData('city', e.target.value)
                                }
                                placeholder="Muscat"
                            />
                        </Field>
                        <Field label="Phone" error={errors.phone}>
                            <TextInput
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                            />
                        </Field>
                    </div>

                    {plans.length > 0 && (
                        <fieldset>
                            <legend className="mb-2 text-[13px] font-bold">
                                Plan (free trial first — no card needed)
                            </legend>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {plans.map((p) => (
                                    <label
                                        key={p.id}
                                        className={cn(
                                            'cursor-pointer rounded-2xl border p-4',
                                            data.plan_id === p.id
                                                ? 'border-2 border-forest bg-forest-soft'
                                                : 'border-line',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="plan"
                                            className="sr-only"
                                            checked={data.plan_id === p.id}
                                            onChange={() =>
                                                setData('plan_id', p.id)
                                            }
                                        />
                                        <div className="font-bold">
                                            {tr(p.name)}
                                        </div>
                                        <div className="text-sm text-muted-ink">
                                            {formatMoney(
                                                p.price_monthly,
                                                p.currency,
                                            )}{' '}
                                            / month
                                        </div>
                                        <div className="mt-1 text-xs font-bold text-forest">
                                            {p.trial_days} days free
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    <Btn
                        type="submit"
                        className="h-14 rounded-full text-base"
                        disabled={processing}
                    >
                        {processing ? 'Creating…' : 'Create my menu'}
                    </Btn>
                </form>
            </div>
        </div>
    );
}
