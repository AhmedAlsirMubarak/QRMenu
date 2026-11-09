import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Copy, ExternalLink, Pencil, Plus, Search, Star, Trash2, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CategoryDialog } from '@/components/menu/category-dialog';
import { ItemEditor, LABELS } from '@/components/menu/item-editor';
import { PhonePreview } from '@/components/menu/phone-preview';
import { Btn, SelectInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CurrencyOption, LanguageOption, MenuCategory, MenuItem, MenuSettings, PlanLimitsInfo } from '@/types';

type Props = {
    categories: MenuCategory[];
    menu: MenuSettings;
    options: {
        languages: Record<string, LanguageOption>;
        currencies: Record<string, CurrencyOption>;
        themes: Record<string, string>;
        dietary: string[];
        allergens: string[];
    };
    limits: PlanLimitsInfo;
    can: { manage_restaurant: boolean };
};

const move = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
};

export default function MenuBuilder({ categories, menu, options, limits, can }: Props) {
    const initial = Number(new URLSearchParams(window.location.search).get('category')) || categories[0]?.id || null;
    const [selectedId, setSelectedId] = useState<number | null>(initial);
    const [search, setSearch] = useState('');
    const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: MenuCategory | null }>({ open: false, category: null });
    const [itemEditor, setItemEditor] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });

    const selected = categories.find((c) => c.id === selectedId) ?? categories[0] ?? null;
    const main = menu.main_language;
    const secondLang = menu.languages.find((l) => l !== main);

    // A search looks through every category, not just the open one.
    const items = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return selected?.items ?? [];
        return categories.flatMap((c) => c.items.filter((i) => Object.values(i.name).some((v) => v?.toLowerCase().includes(q))));
    }, [categories, selected, search]);
    const categoryName = (id: number) => tr(categories.find((c) => c.id === id)?.name ?? {}, menu.main_language);

    const reorderCategories = (index: number, dir: -1 | 1) =>
        router.post('/app/menu/categories/reorder', { ids: move(categories, index, dir).map((c) => c.id) }, { preserveScroll: true, preserveState: true });

    const reorderItems = (index: number, dir: -1 | 1) => {
        if (!selected) return;
        router.post('/app/menu/items/reorder', { ids: move(selected.items, index, dir).map((i) => i.id) }, { preserveScroll: true, preserveState: true });
    };

    const toggle = (item: MenuItem, field: 'is_available' | 'is_featured') =>
        router.patch(`/app/menu/items/${item.id}/toggle`, { field, value: !item[field] }, { preserveScroll: true, preserveState: true });

    const removeCategory = (c: MenuCategory) => {
        if (!window.confirm(`Delete “${tr(c.name, main)}” and its ${c.items.length} dish(es)?`)) return;
        router.delete(`/app/menu/categories/${c.id}`, { preserveScroll: true, onSuccess: () => setSelectedId(null) });
    };

    const removeItem = (i: MenuItem) => {
        if (!window.confirm(`Delete “${tr(i.name, main)}”?`)) return;
        router.delete(`/app/menu/items/${i.id}`, { preserveScroll: true, preserveState: true });
    };

    const editorShared = { languages: menu.languages, mainLanguage: main, languageInfo: options.languages };

    return (
        <>
            <Head title="Menu" />
            <PageHeader
                title="Menu"
                description={limits.max_items !== null ? `${limits.items_used ?? 0} of ${limits.max_items} dishes used on your ${limits.plan ?? ''} plan` : undefined}
                actions={
                    <>
                        <a href="/app/menu/import" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold">
                            Import / Export
                        </a>
                        <a href={`/${menu.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold">
                            Preview <ExternalLink className="size-4" />
                        </a>
                        <Btn onClick={() => setItemEditor({ open: true, item: null })} disabled={categories.length === 0}>
                            <Plus className="size-4" /> Add dish
                        </Btn>
                    </>
                }
            />

            {can.manage_restaurant && <MenuSettingsStrip menu={menu} options={options} maxLanguages={limits.max_languages} />}

            {categories.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-white px-6 py-16 text-center">
                    <UtensilsCrossed className="size-10 text-muted-ink" />
                    <h2 className="font-display text-2xl font-extrabold">Start with your first category</h2>
                    <p className="max-w-md text-muted-ink">Categories are the sections of your menu — Breakfast, Grills, Drinks. Then add dishes inside each one.</p>
                    <Btn onClick={() => setCategoryDialog({ open: true, category: null })}><Plus className="size-4" /> Add category</Btn>
                </div>
            ) : (
                <div className="flex flex-wrap items-start gap-4">
                    <section aria-label="Categories" className="w-full rounded-2xl border border-line bg-white p-3 lg:w-[250px] lg:shrink-0">
                        <div className="flex items-center px-1 pb-2">
                            <h2 className="text-[15px] font-bold">Categories</h2>
                            <button type="button" onClick={() => setCategoryDialog({ open: true, category: null })} className="ml-auto grid size-9 place-items-center rounded-[10px] border border-line-strong" aria-label="Add category">
                                <Plus className="size-4" />
                            </button>
                        </div>
                        <ul className="flex flex-col gap-1">
                            {categories.map((c, index) => {
                                const active = c.id === selected?.id;
                                return (
                                    <li key={c.id} className={cn('flex items-center rounded-[10px]', active ? 'bg-ink text-white' : 'hover:bg-paper')}>
                                        <button type="button" onClick={() => setSelectedId(c.id)} className={cn('flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-sm', active ? 'font-bold' : 'font-semibold', !c.is_active && !active && 'text-muted-ink')}>
                                            <span className="truncate">{tr(c.name, main)}</span>
                                            {!c.is_active && <span className="rounded border border-current px-1 text-[10px]">Hidden</span>}
                                            <span className={cn('ml-auto text-xs', active ? 'text-[#B5B0A8]' : 'text-muted-ink')}>{c.items.length}</span>
                                        </button>
                                        <span className="flex pr-1">
                                            <button type="button" onClick={() => reorderCategories(index, -1)} disabled={index === 0} className="grid size-8 place-items-center rounded-md opacity-60 hover:opacity-100 disabled:opacity-20" aria-label={`Move ${tr(c.name, main)} up`}><ArrowUp className="size-3.5" /></button>
                                            <button type="button" onClick={() => reorderCategories(index, 1)} disabled={index === categories.length - 1} className="grid size-8 place-items-center rounded-md opacity-60 hover:opacity-100 disabled:opacity-20" aria-label={`Move ${tr(c.name, main)} down`}><ArrowDown className="size-3.5" /></button>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <section aria-label="Dishes" className="min-w-0 flex-[999_1_480px] overflow-hidden rounded-2xl border border-line bg-white">
                        {selected && (
                            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                                <h2 className="text-[15px] font-bold">{search.trim() ? `Results for “${search.trim()}” in all categories` : tr(selected.name, main)}</h2>
                                {!search.trim() && (
                                    <>
                                        <button type="button" onClick={() => setCategoryDialog({ open: true, category: selected })} className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label="Edit category"><Pencil className="size-4" /></button>
                                        <button type="button" onClick={() => removeCategory(selected)} className="grid size-9 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label="Delete category"><Trash2 className="size-4" /></button>
                                    </>
                                )}
                                <label className="ml-auto flex items-center gap-2 rounded-[10px] border border-line-strong px-3">
                                    <Search className="size-4 text-muted-ink" aria-hidden />
                                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all dishes" aria-label="Search all dishes" className="h-9 w-40 bg-transparent text-sm outline-none" />
                                </label>
                            </div>
                        )}
                        <div className="relative overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted-ink">
                                        <th className="px-4 py-2.5 font-bold">DISH</th>
                                        <th className="px-2 py-2.5 font-bold">LABELS</th>
                                        <th className="px-2 py-2.5 font-bold">PRICE</th>
                                        <th className="px-2 py-2.5 font-bold">AVAILABLE</th>
                                        <th className="px-2 py-2.5 font-bold">FEATURED</th>
                                        <th className="px-2 py-2.5"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-muted-ink">
                                                {search ? 'No dishes match your search.' : (
                                                    <span className="flex flex-col items-center gap-3">
                                                        No dishes in this category yet.
                                                        <Btn variant="outline" onClick={() => setItemEditor({ open: true, item: null })}><Plus className="size-4" /> Add dish</Btn>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {items.map((item, index) => {
                                        const labels = [...(item.dietary_tags ?? []), ...(item.allergens ?? [])];
                                        const missing = menu.languages.filter((l) => l !== main && !item.name[l]);
                                        return (
                                            <tr key={item.id} className="border-t border-[#F1F0EC]">
                                                <td className="px-4 py-2.5">
                                                    <button type="button" onClick={() => setItemEditor({ open: true, item })} className="flex items-center gap-3 text-left">
                                                        <span className="size-11 shrink-0 overflow-hidden rounded-[10px] bg-[#E9C79A]">
                                                            {item.image_url && <img src={item.image_url} alt="" className="size-full object-cover" />}
                                                        </span>
                                                        <span>
                                                            <span className="block font-bold hover:underline">{tr(item.name, main)}</span>
                                                            {missing.length > 0 ? (
                                                                <span className="text-[13px] text-clay">{missing.map((l) => options.languages[l]?.name ?? l).join(', ')} missing</span>
                                                            ) : secondLang ? (
                                                                <span className="text-[13px] text-muted-ink" dir="auto">{item.name[secondLang]}</span>
                                                            ) : null}
                                                            {item.options.length > 0 && <span className="text-[13px] text-muted-ink"> · {item.options.length} {item.options.length === 1 ? 'option' : 'options'}</span>}
                                                            {search && item.menu_category_id !== selected?.id && <span className="block text-[13px] text-muted-ink">in {categoryName(item.menu_category_id)}</span>}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <span className="flex max-w-[180px] flex-wrap gap-1">
                                                        {labels.slice(0, 3).map((l) => (
                                                            <span key={l} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-bold', (item.dietary_tags ?? []).includes(l) ? 'bg-forest-soft text-forest' : 'bg-saffron-soft')}>{LABELS[l] ?? l}</span>
                                                        ))}
                                                        {labels.length > 3 && <span className="text-[11px] text-muted-ink">+{labels.length - 3}</span>}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-2.5 font-bold">
                                                    {item.compare_at_price && <span className="mr-1 font-medium text-muted-ink line-through">{formatMoney(item.compare_at_price, menu.currency).replace(` ${menu.currency}`, '')}</span>}
                                                    {formatMoney(item.price, menu.currency)}
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <button type="button" role="switch" aria-checked={item.is_available} aria-label={`${tr(item.name, main)} available`} onClick={() => toggle(item, 'is_available')} className={cn('relative h-6 w-10 rounded-full transition-colors', item.is_available ? 'bg-forest' : 'bg-line-strong')}>
                                                        <span className={cn('absolute top-[3px] size-[18px] rounded-full bg-white transition-all', item.is_available ? 'right-[3px]' : 'left-[3px]')} />
                                                    </button>
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <button type="button" aria-pressed={item.is_featured} aria-label={`Feature ${tr(item.name, main)}`} onClick={() => toggle(item, 'is_featured')} className="grid size-9 place-items-center rounded-lg hover:bg-paper">
                                                        <Star className={cn('size-5', item.is_featured ? 'fill-saffron text-[#C98A12]' : 'text-[#B5B0A8]')} />
                                                    </button>
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <span className="flex justify-end">
                                                        {!search && (
                                                            <>
                                                                <IconBtn label="Move up" onClick={() => reorderItems(index, -1)} disabled={index === 0}><ArrowUp className="size-4" /></IconBtn>
                                                                <IconBtn label="Move down" onClick={() => reorderItems(index, 1)} disabled={index === items.length - 1}><ArrowDown className="size-4" /></IconBtn>
                                                            </>
                                                        )}
                                                        <IconBtn label="Edit" onClick={() => setItemEditor({ open: true, item })}><Pencil className="size-4" /></IconBtn>
                                                        <IconBtn label="Duplicate" onClick={() => router.post(`/app/menu/items/${item.id}/duplicate`, {}, { preserveScroll: true, preserveState: true })}><Copy className="size-4" /></IconBtn>
                                                        <IconBtn label="Delete" onClick={() => removeItem(item)} danger><Trash2 className="size-4" /></IconBtn>
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <aside className="hidden w-[280px] shrink-0 xl:block">
                        <PhonePreview menu={menu} categories={categories} selectedId={selected?.id ?? null} languageInfo={options.languages} />
                    </aside>
                </div>
            )}

            <CategoryDialog open={categoryDialog.open} category={categoryDialog.category} onClose={() => setCategoryDialog({ open: false, category: null })} {...editorShared} />
            <ItemEditor
                open={itemEditor.open}
                item={itemEditor.item}
                onClose={() => setItemEditor({ open: false, item: null })}
                defaultCategoryId={selected?.id ?? null}
                categories={categories}
                currency={menu.currency}
                dietary={options.dietary}
                allergens={options.allergens}
                {...editorShared}
            />
        </>
    );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn('grid size-9 place-items-center rounded-lg disabled:opacity-25', danger ? 'text-clay hover:bg-clay-soft' : 'text-muted-ink hover:bg-paper hover:text-ink')}>
            {children}
        </button>
    );
}

function MenuSettingsStrip({ menu, options, maxLanguages }: { menu: MenuSettings; options: Props['options']; maxLanguages: number | null }) {
    const { data, setData, put, processing, isDirty, errors } = useForm({
        main_language: menu.main_language,
        languages: menu.languages,
        currency: menu.currency,
        theme: menu.theme,
    });
    const extra = data.languages.filter((l) => l !== data.main_language);
    const available = Object.keys(options.languages).filter((l) => l !== data.main_language && !extra.includes(l));
    const atLimit = maxLanguages !== null && extra.length + 1 >= maxLanguages;

    return (
        <section aria-label="Menu settings" className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl border border-line bg-white px-4 py-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-ink">
                MAIN LANGUAGE
                <SelectInput
                    value={data.main_language}
                    onChange={(e) => {
                        const value = e.target.value;
                        setData((d) => ({ ...d, main_language: value, languages: [value, ...d.languages.filter((l) => l !== value)] }));
                    }}
                    className="min-w-40 text-ink"
                >
                    {Object.entries(options.languages).map(([code, l]) => <option key={code} value={code}>{l.native}</option>)}
                </SelectInput>
            </label>
            <div className="flex flex-col gap-1.5 text-xs font-bold text-muted-ink">
                OTHER LANGUAGES
                <div className="flex flex-wrap gap-1.5">
                    {extra.map((l) => (
                        <span key={l} className="inline-flex h-[42px] items-center gap-2 rounded-[10px] bg-[#F1F0EC] px-3 text-sm text-ink">
                            {options.languages[l]?.native ?? l}
                            <button type="button" onClick={() => setData('languages', data.languages.filter((x) => x !== l))} aria-label={`Remove ${options.languages[l]?.name ?? l}`} className="text-lg leading-none text-muted-ink hover:text-clay">×</button>
                        </span>
                    ))}
                    {available.length > 0 && (
                        <SelectInput
                            aria-label="Add language"
                            value=""
                            disabled={atLimit}
                            title={atLimit ? 'Upgrade your plan to add more languages' : undefined}
                            onChange={(e) => { if (e.target.value) setData('languages', [...data.languages, e.target.value]); }}
                            className="border-dashed font-bold text-ink"
                        >
                            <option value="">{atLimit ? 'Plan limit reached' : '+ Add language'}</option>
                            {available.map((code) => <option key={code} value={code}>{options.languages[code].native}</option>)}
                        </SelectInput>
                    )}
                </div>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-ink">
                CURRENCY
                <SelectInput value={data.currency} onChange={(e) => setData('currency', e.target.value)} className="min-w-36 text-ink">
                    {Object.entries(options.currencies).map(([code, c]) => <option key={code} value={code}>{code} — {c.name}</option>)}
                </SelectInput>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-ink">
                THEME
                <SelectInput value={data.theme} onChange={(e) => setData('theme', e.target.value)} className="min-w-32 text-ink">
                    {Object.entries(options.themes).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </SelectInput>
            </label>
            {isDirty && (
                <Btn variant="forest" className="ml-auto" disabled={processing} onClick={() => put('/app/menu/settings', { preserveScroll: true })}>Save settings</Btn>
            )}
            {errors.languages && <p className="w-full text-sm font-semibold text-clay">{errors.languages}</p>}
        </section>
    );
}
