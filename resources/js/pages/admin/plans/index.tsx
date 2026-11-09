import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    Btn,
    CheckRow,
    Field,
    SelectInput,
    TextInput,
} from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types';

type Props = {
    plans: Plan[];
    features: Record<string, string>;
    currencies: string[];
};

type PlanForm = {
    name: { en: string; ar: string };
    description: { en: string; ar: string };
    slug: string;
    price_monthly: string;
    price_yearly: string;
    currency: string;
    max_branches: string;
    max_languages: string;
    max_items: string;
    trial_days: string;
    features: string[];
    is_active: boolean;
    is_public: boolean;
    is_featured: boolean;
    sort_order: number;
};

const toForm = (plan?: Plan, nextSort = 0): PlanForm => ({
    name: { en: plan?.name.en ?? '', ar: plan?.name.ar ?? '' },
    description: {
        en: plan?.description?.en ?? '',
        ar: plan?.description?.ar ?? '',
    },
    slug: plan?.slug ?? '',
    price_monthly: plan?.price_monthly ?? '',
    price_yearly: plan?.price_yearly ?? '',
    currency: plan?.currency ?? 'OMR',
    max_branches: plan?.max_branches?.toString() ?? '',
    max_languages: plan?.max_languages?.toString() ?? '',
    max_items: plan?.max_items?.toString() ?? '',
    trial_days: plan?.trial_days?.toString() ?? '14',
    features: plan?.features ?? [],
    is_active: plan?.is_active ?? true,
    is_public: plan?.is_public ?? true,
    is_featured: plan?.is_featured ?? false,
    sort_order: plan?.sort_order ?? nextSort,
});

const limit = (value: number | null, unit: string) =>
    value === null ? `Unlimited ${unit}` : `${value} ${unit}`;

export default function PlansIndex({ plans, features, currencies }: Props) {
    // null = panel closed, 'new' = creating, number = editing that plan id
    const [editing, setEditing] = useState<number | 'new' | null>(
        plans[0]?.id ?? null,
    );
    const current =
        typeof editing === 'number'
            ? plans.find((p) => p.id === editing)
            : undefined;

    const remove = (plan: Plan) => {
        if (
            !window.confirm(
                `Delete the “${tr(plan.name)}” plan? Restaurants on it keep their history.`,
            )
        )
            return;
        router.delete(`/admin/plans/${plan.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditing((e) => (e === plan.id ? null : e)),
        });
    };

    return (
        <>
            <Head title="Plans" />
            <PageHeader
                title="Subscription plans"
                description="Changes appear on the website pricing section and in restaurant billing."
                actions={
                    <Btn onClick={() => setEditing('new')}>
                        <Plus className="size-4" /> New plan
                    </Btn>
                }
            />

            <div className="flex flex-wrap items-start gap-5">
                <div className="grid min-w-0 flex-[999_1_520px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {plans.length === 0 && (
                        <div className="col-span-full rounded-2xl border border-dashed border-line-strong bg-white p-10 text-center text-muted-ink">
                            No plans yet. Create your first one.
                        </div>
                    )}
                    {plans.map((plan) => (
                        <article
                            key={plan.id}
                            className={cn(
                                'flex flex-col gap-3 rounded-2xl bg-white p-5',
                                editing === plan.id
                                    ? 'border-2 border-forest'
                                    : 'border border-line',
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-extrabold">
                                    {tr(plan.name)}
                                </h2>
                                {plan.is_featured && (
                                    <Star
                                        className="size-4 fill-saffron text-saffron"
                                        aria-label="Most popular"
                                    />
                                )}
                                <span
                                    className={cn(
                                        'ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold',
                                        plan.is_active && plan.is_public
                                            ? 'bg-forest-soft text-forest'
                                            : 'bg-[#F1F0EC] text-muted-ink',
                                    )}
                                >
                                    {!plan.is_active
                                        ? 'Inactive'
                                        : plan.is_public
                                          ? 'Active'
                                          : 'Hidden'}
                                </span>
                            </div>
                            <div>
                                <span className="font-display text-4xl font-extrabold">
                                    {Number(plan.price_monthly).toString()}
                                </span>
                                <span className="font-bold">
                                    {' '}
                                    {plan.currency}
                                </span>
                                <span className="text-muted-ink"> / month</span>
                            </div>
                            <div className="text-[13px] text-muted-ink">
                                {plan.price_yearly
                                    ? `Yearly: ${formatMoney(plan.price_yearly, plan.currency)}`
                                    : 'No yearly price'}{' '}
                                · {plan.active_subscriptions_count ?? 0}{' '}
                                restaurants
                            </div>
                            <ul className="list-disc pl-5 text-sm leading-7">
                                <li>
                                    {limit(plan.max_branches, plan.max_branches === 1 ? 'branch' : 'branches')}
                                </li>
                                <li>
                                    {limit(plan.max_languages, 'languages')}
                                </li>
                                <li>{limit(plan.max_items, 'menu items')}</li>
                                <li>
                                    {(plan.features ?? []).length} features ·{' '}
                                    {plan.trial_days}-day trial
                                </li>
                            </ul>
                            <div className="mt-1 flex gap-2">
                                <Btn
                                    variant="outline"
                                    className="h-[42px] flex-1"
                                    onClick={() => setEditing(plan.id)}
                                >
                                    Edit
                                </Btn>
                                <Btn
                                    variant="danger"
                                    className="h-[42px] w-11 px-0"
                                    onClick={() => remove(plan)}
                                    aria-label={`Delete ${tr(plan.name)}`}
                                >
                                    <Trash2 className="size-4" />
                                </Btn>
                            </div>
                        </article>
                    ))}
                </div>

                {editing !== null && (
                    <PlanEditor
                        key={editing}
                        plan={current}
                        nextSort={plans.length + 1}
                        features={features}
                        currencies={currencies}
                        onClose={() => setEditing(null)}
                        onCreated={() => setEditing(null)}
                    />
                )}
            </div>
        </>
    );
}

function PlanEditor({
    plan,
    nextSort,
    features,
    currencies,
    onClose,
    onCreated,
}: {
    plan?: Plan;
    nextSort: number;
    features: Record<string, string>;
    currencies: string[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const form = useForm<PlanForm>(toForm(plan, nextSort));
    const { data, setData, errors, processing } = form;
    const err = errors as Record<string, string | undefined>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            price_yearly: d.price_yearly === '' ? null : d.price_yearly,
            max_branches: d.max_branches === '' ? null : Number(d.max_branches),
            max_languages:
                d.max_languages === '' ? null : Number(d.max_languages),
            max_items: d.max_items === '' ? null : Number(d.max_items),
            trial_days: Number(d.trial_days || 0),
        }));

        if (plan) {
            form.put(`/admin/plans/${plan.id}`, { preserveScroll: true });
        } else {
            form.post('/admin/plans', {
                preserveScroll: true,
                onSuccess: onCreated,
            });
        }
    };

    const toggleFeature = (key: string, on: boolean) =>
        setData(
            'features',
            on
                ? [...data.features, key]
                : data.features.filter((f) => f !== key),
        );

    return (
        <section
            aria-label={plan ? 'Edit plan' : 'New plan'}
            className="flex w-full flex-[1_1_340px] flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_rgba(20,17,15,0.08)] lg:max-w-[400px]"
        >
            <div className="flex items-center">
                <h2 className="text-lg font-extrabold">
                    {plan ? `Edit ${tr(plan.name)}` : 'New plan'}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto grid size-9 place-items-center rounded-[10px] border border-line"
                    aria-label="Close"
                >
                    <X className="size-4" />
                </button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Name (English)" error={err['name.en']}>
                        <TextInput
                            value={data.name.en}
                            onChange={(e) =>
                                setData('name', {
                                    ...data.name,
                                    en: e.target.value,
                                })
                            }
                            required
                        />
                    </Field>
                    <Field label="Name (Arabic)" error={err['name.ar']}>
                        <TextInput
                            dir="rtl"
                            value={data.name.ar}
                            onChange={(e) =>
                                setData('name', {
                                    ...data.name,
                                    ar: e.target.value,
                                })
                            }
                        />
                    </Field>
                </div>
                <Field label="Short description (English)">
                    <TextInput
                        value={data.description.en}
                        onChange={(e) =>
                            setData('description', {
                                ...data.description,
                                en: e.target.value,
                            })
                        }
                        placeholder="For small cafés"
                    />
                </Field>
                <div className="grid grid-cols-3 gap-2.5">
                    <Field label="Monthly" error={errors.price_monthly}>
                        <TextInput
                            inputMode="decimal"
                            value={data.price_monthly}
                            onChange={(e) =>
                                setData('price_monthly', e.target.value)
                            }
                            required
                        />
                    </Field>
                    <Field label="Yearly" error={errors.price_yearly}>
                        <TextInput
                            inputMode="decimal"
                            value={data.price_yearly}
                            onChange={(e) =>
                                setData('price_yearly', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Currency" error={errors.currency}>
                        <SelectInput
                            value={data.currency}
                            onChange={(e) =>
                                setData('currency', e.target.value)
                            }
                        >
                            {currencies.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </SelectInput>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Max branches" error={errors.max_branches}>
                        <TextInput
                            inputMode="numeric"
                            placeholder="Unlimited"
                            value={data.max_branches}
                            onChange={(e) =>
                                setData('max_branches', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Max languages" error={errors.max_languages}>
                        <TextInput
                            inputMode="numeric"
                            placeholder="Unlimited"
                            value={data.max_languages}
                            onChange={(e) =>
                                setData('max_languages', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Max menu items" error={errors.max_items}>
                        <TextInput
                            inputMode="numeric"
                            placeholder="Unlimited"
                            value={data.max_items}
                            onChange={(e) =>
                                setData('max_items', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Free trial (days)" error={errors.trial_days}>
                        <TextInput
                            inputMode="numeric"
                            value={data.trial_days}
                            onChange={(e) =>
                                setData('trial_days', e.target.value)
                            }
                        />
                    </Field>
                </div>

                <fieldset className="rounded-xl border border-line px-3.5 py-2.5">
                    <legend className="px-1 text-[13px] font-bold">
                        Features
                    </legend>
                    {Object.entries(features).map(([key, label]) => (
                        <CheckRow
                            key={key}
                            checked={data.features.includes(key)}
                            onChange={(on) => toggleFeature(key, on)}
                        >
                            {label}
                        </CheckRow>
                    ))}
                </fieldset>

                <div>
                    <CheckRow
                        checked={data.is_active}
                        onChange={(v) => setData('is_active', v)}
                    >
                        Active (new restaurants can choose it)
                    </CheckRow>
                    <CheckRow
                        checked={data.is_public}
                        onChange={(v) => setData('is_public', v)}
                    >
                        Show on website pricing
                    </CheckRow>
                    <CheckRow
                        checked={data.is_featured}
                        onChange={(v) => setData('is_featured', v)}
                    >
                        Mark as “Most popular”
                    </CheckRow>
                </div>

                {Object.keys(errors).length > 0 && (
                    <p className="text-sm font-semibold text-clay">
                        Please fix the highlighted fields.
                    </p>
                )}

                <Btn
                    type="submit"
                    variant="forest"
                    className="h-12"
                    disabled={processing}
                >
                    {processing
                        ? 'Saving…'
                        : plan
                          ? 'Save plan'
                          : 'Create plan'}
                </Btn>
            </form>
        </section>
    );
}
