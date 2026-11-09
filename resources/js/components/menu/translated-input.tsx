import { TextInput } from '@/components/platform/fields';
import { cn } from '@/lib/utils';
import type { LanguageOption, Translations } from '@/types';

type Props = {
    label: string;
    value: Translations;
    onChange: (value: Translations) => void;
    languages: string[];
    mainLanguage: string;
    languageInfo: Record<string, LanguageOption>;
    errors?: Record<string, string | undefined>;
    errorKey: string;
    multiline?: boolean;
    placeholder?: string;
};

/** One input per menu language; the main language is required, others show "missing" hints. */
export function TranslatedInput({
    label,
    value,
    onChange,
    languages,
    mainLanguage,
    languageInfo,
    errors = {},
    errorKey,
    multiline,
    placeholder,
}: Props) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13px] font-bold">{label}</legend>
            {languages.map((lang) => {
                const info = languageInfo[lang];
                const dir = info?.dir === 'rtl' ? 'rtl' : 'ltr';
                const isMain = lang === mainLanguage;
                const id = `${errorKey}-${lang}`;
                const error = errors[`${errorKey}.${lang}`];
                const common = {
                    id,
                    dir,
                    value: value[lang] ?? '',
                    placeholder: isMain ? placeholder : undefined,
                    required: isMain && !multiline,
                    lang,
                };

                return (
                    <div key={lang} className="flex flex-col gap-1">
                        <label
                            htmlFor={id}
                            className="flex items-center gap-2 text-xs font-semibold text-muted-ink"
                        >
                            {info?.native ?? lang}
                            {isMain && (
                                <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    MAIN
                                </span>
                            )}
                            {!isMain && !value[lang] && !multiline && (
                                <span className="font-bold text-clay">
                                    missing
                                </span>
                            )}
                        </label>
                        {multiline ? (
                            <textarea
                                {...common}
                                rows={2}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        [lang]: e.target.value,
                                    })
                                }
                                className={cn(
                                    'rounded-[10px] border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20',
                                    dir === 'rtl' && 'font-arabic',
                                )}
                            />
                        ) : (
                            <TextInput
                                {...common}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        [lang]: e.target.value,
                                    })
                                }
                                className={cn(dir === 'rtl' && 'font-arabic')}
                            />
                        )}
                        {error && (
                            <span className="text-xs font-semibold text-clay">
                                {error}
                            </span>
                        )}
                    </div>
                );
            })}
        </fieldset>
    );
}
