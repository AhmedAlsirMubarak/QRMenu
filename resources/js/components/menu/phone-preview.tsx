import { useState } from 'react';
import { formatMoney, tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { LanguageOption, MenuCategory, MenuSettings } from '@/types';

/** A small live preview of what guests will see for the selected category. */
export function PhonePreview({
    menu,
    categories,
    selectedId,
    languageInfo,
}: {
    menu: MenuSettings;
    categories: MenuCategory[];
    selectedId: number | null;
    languageInfo: Record<string, LanguageOption>;
}) {
    const [lang, setLang] = useState(menu.main_language);
    const activeLang = menu.languages.includes(lang)
        ? lang
        : menu.main_language;
    const rtl = languageInfo[activeLang]?.dir === 'rtl';
    const visible = categories.filter((c) => c.is_active);
    const current = visible.find((c) => c.id === selectedId) ?? visible[0];
    const initials = menu.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-ink">
                LIVE PREVIEW
                {menu.languages.length > 1 && (
                    <span className="flex rounded-full bg-white p-0.5">
                        {menu.languages.map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                className={cn(
                                    'rounded-full px-2 py-1 text-[11px]',
                                    l === activeLang
                                        ? 'bg-ink text-white'
                                        : 'text-ink',
                                )}
                            >
                                {languageInfo[l]?.native ?? l}
                            </button>
                        ))}
                    </span>
                )}
            </div>
            <div className="h-[520px] w-[260px] rounded-[38px] bg-ink p-2.5">
                <div
                    dir={rtl ? 'rtl' : 'ltr'}
                    className={cn(
                        'size-full overflow-y-auto rounded-[30px] bg-paper',
                        rtl && 'font-arabic',
                    )}
                >
                    <div
                        className="h-24 bg-ink-2 bg-cover bg-center"
                        style={
                            menu.cover_url
                                ? { backgroundImage: `url(${menu.cover_url})` }
                                : undefined
                        }
                    />
                    <div className="px-3">
                        <div className="-mt-6 grid size-12 place-items-center overflow-hidden rounded-2xl border-[3px] border-paper bg-saffron text-sm font-extrabold">
                            {menu.logo_url ? (
                                <img
                                    src={menu.logo_url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="mt-1 font-display text-lg font-extrabold">
                            {menu.name}
                        </div>
                        <div className="my-2.5 flex gap-1.5 overflow-x-auto">
                            {visible.map((c) => (
                                <span
                                    key={c.id}
                                    className={cn(
                                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                                        c.id === current?.id
                                            ? 'bg-ink text-white'
                                            : 'bg-[#F1F0EC]',
                                    )}
                                >
                                    {tr(c.name, activeLang, menu.main_language)}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 pb-4">
                            {!current && (
                                <p className="py-6 text-center text-xs text-muted-ink">
                                    Add a category to see it here.
                                </p>
                            )}
                            {current?.items.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        'flex gap-2 rounded-xl border border-line bg-white p-1.5',
                                        !item.is_available && 'opacity-55',
                                    )}
                                >
                                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-[#E9C79A]">
                                        {item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 text-[11px] leading-tight">
                                        <b className="block truncate">
                                            {tr(
                                                item.name,
                                                activeLang,
                                                menu.main_language,
                                            )}
                                        </b>
                                        <span className="line-clamp-1 text-muted-ink">
                                            {tr(
                                                item.description,
                                                activeLang,
                                                menu.main_language,
                                            )}
                                        </span>
                                        <b className="mt-0.5 block">
                                            {item.compare_at_price && (
                                                <span className="me-1 font-medium text-muted-ink line-through">
                                                    {formatMoney(
                                                        item.compare_at_price,
                                                        menu.currency,
                                                    )}
                                                </span>
                                            )}
                                            {formatMoney(
                                                item.price,
                                                menu.currency,
                                            )}
                                        </b>
                                        {!item.is_available && (
                                            <span className="font-bold text-clay">
                                                {activeLang === 'ar'
                                                    ? 'نفد'
                                                    : 'Sold out'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-xs text-muted-ink">/{menu.slug}</div>
        </div>
    );
}
