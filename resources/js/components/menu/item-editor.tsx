import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { ImagePicker } from '@/components/menu/image-picker';
import { TranslatedInput } from '@/components/menu/translated-input';
import {
    Btn,
    CheckRow,
    Field,
    SelectInput,
    TextInput,
} from '@/components/platform/fields';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
    LanguageOption,
    MenuCategory,
    MenuItem,
    MenuItemOption,
    Translations,
} from '@/types';

export const LABELS: Record<string, string> = {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    spicy: 'Spicy',
    halal: 'Halal',
    gluten_free: 'Gluten-free',
    gluten: 'Gluten',
    dairy: 'Dairy',
    eggs: 'Eggs',
    nuts: 'Tree nuts',
    peanuts: 'Peanuts',
    soy: 'Soy',
    fish: 'Fish',
    shellfish: 'Shellfish',
    sesame: 'Sesame',
};

type Props = {
    open: boolean;
    onClose: () => void;
    item: MenuItem | null; // null = new dish
    defaultCategoryId: number | null;
    categories: MenuCategory[];
    languages: string[];
    mainLanguage: string;
    languageInfo: Record<string, LanguageOption>;
    currency: string;
    dietary: string[];
    allergens: string[];
};

type ItemForm = {
    name: Translations;
    description: Translations;
    menu_category_id: number | '';
    sku: string;
    price: string;
    compare_at_price: string;
    calories: string;
    is_available: boolean;
    is_featured: boolean;
    dietary_tags: string[];
    allergens: string[];
    options: MenuItemOption[];
    image: File | null;
    remove_image: boolean;
    _method?: 'put';
};

export function ItemEditor(props: Props) {
    return (
        <Sheet open={props.open} onOpenChange={(o) => !o && props.onClose()}>
            <SheetContent
                side="right"
                className="w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-[520px]"
            >
                {/* key resets the form whenever another dish is opened */}
                {props.open && (
                    <ItemEditorForm
                        key={props.item?.id ?? `new-${props.defaultCategoryId}`}
                        {...props}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}

function ItemEditorForm({
    item,
    onClose,
    defaultCategoryId,
    categories,
    languages,
    mainLanguage,
    languageInfo,
    currency,
    dietary,
    allergens,
}: Props) {
    const form = useForm<ItemForm>({
        name: item?.name ?? {},
        description: item?.description ?? {},
        menu_category_id:
            item?.menu_category_id ??
            defaultCategoryId ??
            categories[0]?.id ??
            '',
        sku: item?.sku ?? '',
        price: item?.price ?? '',
        compare_at_price: item?.compare_at_price ?? '',
        calories: item?.calories?.toString() ?? '',
        is_available: item?.is_available ?? true,
        is_featured: item?.is_featured ?? false,
        dietary_tags: item?.dietary_tags ?? [],
        allergens: item?.allergens ?? [],
        options:
            item?.options.map((o) => ({
                type: o.type,
                name: o.name,
                price: o.price,
            })) ?? [],
        image: null,
        remove_image: false,
    });
    const { data, setData, processing } = form;
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: onClose,
        };

        if (item) {
            form.transform((d) => ({ ...d, _method: 'put' as const }));
            form.post(`/app/menu/items/${item.id}`, options);
        } else {
            form.post('/app/menu/items', options);
        }
    };

    const toggleIn = (key: 'dietary_tags' | 'allergens', value: string) =>
        setData(
            key,
            data[key].includes(value)
                ? data[key].filter((v) => v !== value)
                : [...data[key], value],
        );

    const setOption = (index: number, patch: Partial<MenuItemOption>) =>
        setData(
            'options',
            data.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
        );

    return (
        <form onSubmit={submit} className="flex min-h-full flex-col">
            <SheetHeader className="border-b border-line px-6 py-5">
                <SheetTitle className="font-display text-2xl font-extrabold">
                    {item ? tr(item.name, mainLanguage) : 'New dish'}
                </SheetTitle>
                <SheetDescription>
                    Fill the main language; add other languages for guests who
                    switch.
                </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 px-6 py-5">
                <ImagePicker
                    label="Photo"
                    currentUrl={item?.image_url ?? null}
                    file={data.image}
                    removed={data.remove_image}
                    onFile={(f) =>
                        setData((d) => ({
                            ...d,
                            image: f,
                            remove_image: false,
                        }))
                    }
                    onRemove={() => setData('remove_image', true)}
                    error={errors.image}
                />

                <TranslatedInput
                    label="Dish name"
                    value={data.name}
                    onChange={(v) => setData('name', v)}
                    languages={languages}
                    mainLanguage={mainLanguage}
                    languageInfo={languageInfo}
                    errors={errors}
                    errorKey="name"
                    placeholder="Shakshuka"
                />
                <TranslatedInput
                    label="Description"
                    value={data.description}
                    onChange={(v) => setData('description', v)}
                    languages={languages}
                    mainLanguage={mainLanguage}
                    languageInfo={languageInfo}
                    errors={errors}
                    errorKey="description"
                    multiline
                />

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Category" error={errors.menu_category_id}>
                        <SelectInput
                            value={data.menu_category_id}
                            onChange={(e) =>
                                setData(
                                    'menu_category_id',
                                    Number(e.target.value),
                                )
                            }
                            required
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {tr(c.name, mainLanguage)}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label={`Price (${currency})`} error={errors.price}>
                        <TextInput
                            inputMode="decimal"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            required
                            placeholder="2.400"
                        />
                    </Field>
                    <Field
                        label="Old price (shows crossed out)"
                        error={errors.compare_at_price}
                    >
                        <TextInput
                            inputMode="decimal"
                            value={data.compare_at_price}
                            onChange={(e) =>
                                setData('compare_at_price', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Calories" error={errors.calories}>
                        <TextInput
                            inputMode="numeric"
                            value={data.calories}
                            onChange={(e) =>
                                setData('calories', e.target.value)
                            }
                        />
                    </Field>
                </div>

                <div className="flex flex-col">
                    <CheckRow
                        checked={data.is_available}
                        onChange={(v) => setData('is_available', v)}
                    >
                        Available (untick to show “Sold out”)
                    </CheckRow>
                    <CheckRow
                        checked={data.is_featured}
                        onChange={(v) => setData('is_featured', v)}
                    >
                        Featured in “Chef’s picks”
                    </CheckRow>
                </div>

                <ChipGroup
                    title="Dietary labels"
                    values={dietary}
                    selected={data.dietary_tags}
                    onToggle={(v) => toggleIn('dietary_tags', v)}
                    tone="forest"
                />
                <ChipGroup
                    title="Contains allergens"
                    values={allergens}
                    selected={data.allergens}
                    onToggle={(v) => toggleIn('allergens', v)}
                    tone="saffron"
                />
                {(() => {
                    // Labels that can't both be true — guests rely on them, so point it out before saving.
                    const clash = [
                        ...(data.dietary_tags.includes('vegan') ? data.allergens.filter((a) => ['dairy', 'eggs', 'fish', 'shellfish'].includes(a)).map((a) => `Vegan + ${a}`) : []),
                        ...(data.dietary_tags.includes('vegetarian') ? data.allergens.filter((a) => ['fish', 'shellfish'].includes(a)).map((a) => `Vegetarian + ${a}`) : []),
                    ];
                    return clash.length > 0 ? (
                        <p role="alert" className="-mt-1 rounded-lg bg-clay-soft px-3 py-2 text-[13px] text-clay">
                            Check these labels — they contradict each other: {clash.join(', ')}.
                        </p>
                    ) : null;
                })()}

                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-[13px] font-bold">
                        Sizes &amp; extras{' '}
                        <span className="font-medium text-muted-ink">
                            (shown as information — no ordering)
                        </span>
                    </legend>
                    {data.options.map((o, i) => (
                        <div
                            key={i}
                            className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-2.5"
                        >
                            <SelectInput
                                aria-label="Type"
                                value={o.type}
                                onChange={(e) =>
                                    setOption(i, {
                                        type: e.target.value as
                                            | 'size'
                                            | 'extra',
                                    })
                                }
                                className="w-24"
                            >
                                <option value="size">Size</option>
                                <option value="extra">Extra</option>
                            </SelectInput>
                            {languages.map((lang) => (
                                <TextInput
                                    key={lang}
                                    aria-label={`Option name (${languageInfo[lang]?.native ?? lang})`}
                                    dir={
                                        languageInfo[lang]?.dir === 'rtl'
                                            ? 'rtl'
                                            : 'ltr'
                                    }
                                    placeholder={
                                        lang === mainLanguage
                                            ? o.type === 'size'
                                                ? 'Large'
                                                : 'Extra cheese'
                                            : languageInfo[lang]?.native
                                    }
                                    value={o.name[lang] ?? ''}
                                    onChange={(e) =>
                                        setOption(i, {
                                            name: {
                                                ...o.name,
                                                [lang]: e.target.value,
                                            },
                                        })
                                    }
                                    className="min-w-0 flex-1"
                                />
                            ))}
                            <TextInput
                                aria-label="Option price"
                                inputMode="decimal"
                                placeholder={
                                    o.type === 'size' ? 'Price' : '+ Price'
                                }
                                value={o.price}
                                onChange={(e) =>
                                    setOption(i, { price: e.target.value })
                                }
                                className="w-24"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setData(
                                        'options',
                                        data.options.filter((_, j) => j !== i),
                                    )
                                }
                                className="grid size-[42px] place-items-center rounded-[10px] text-clay hover:bg-clay-soft"
                                aria-label="Remove option"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Btn
                            variant="outline"
                            className="h-10"
                            onClick={() =>
                                setData('options', [
                                    ...data.options,
                                    { type: 'size', name: {}, price: '' },
                                ])
                            }
                        >
                            <Plus className="size-4" /> Size
                        </Btn>
                        <Btn
                            variant="outline"
                            className="h-10"
                            onClick={() =>
                                setData('options', [
                                    ...data.options,
                                    { type: 'extra', name: {}, price: '' },
                                ])
                            }
                        >
                            <Plus className="size-4" /> Extra
                        </Btn>
                    </div>
                    {Object.keys(errors).some((k) =>
                        k.startsWith('options'),
                    ) && (
                        <span className="text-xs font-semibold text-clay">
                            Each size/extra needs a name and a price.
                        </span>
                    )}
                </fieldset>

                <Field
                    label="SKU / code (optional — used to update dishes from Excel)"
                    error={errors.sku}
                >
                    <TextInput
                        value={data.sku}
                        onChange={(e) => setData('sku', e.target.value)}
                    />
                </Field>
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-line bg-white px-6 py-4">
                <Btn variant="outline" onClick={onClose}>
                    Cancel
                </Btn>
                <Btn
                    type="submit"
                    variant="forest"
                    className="flex-1"
                    disabled={processing}
                >
                    {processing ? 'Saving…' : item ? 'Save dish' : 'Add dish'}
                </Btn>
            </div>
        </form>
    );
}

function ChipGroup({
    title,
    values,
    selected,
    onToggle,
    tone,
}: {
    title: string;
    values: string[];
    selected: string[];
    onToggle: (v: string) => void;
    tone: 'forest' | 'saffron';
}) {
    return (
        <fieldset>
            <legend className="mb-2 text-[13px] font-bold">{title}</legend>
            <div className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                    const on = selected.includes(v);
                    return (
                        <button
                            key={v}
                            type="button"
                            aria-pressed={on}
                            onClick={() => onToggle(v)}
                            className={cn(
                                'h-9 rounded-full px-3 text-sm font-semibold',
                                on
                                    ? tone === 'forest'
                                        ? 'bg-forest text-white'
                                        : 'bg-saffron text-ink'
                                    : 'border border-line-strong bg-white',
                            )}
                        >
                            {LABELS[v] ?? v}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
