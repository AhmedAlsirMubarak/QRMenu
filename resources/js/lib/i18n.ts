import type { Translations } from '@/types/platform';

/** Pick a value from a {"en": "...", "ar": "..."} object with sensible fallbacks. */
export function tr(
    value: Translations | null | undefined,
    locale = 'en',
    fallback = 'en',
): string {
    if (!value) {
        return '';
    }

    return (
        value[locale] ||
        value[fallback] ||
        Object.values(value).find(Boolean) ||
        ''
    );
}

export function formatMoney(amount: string | number, currency = 'OMR'): string {
    const decimals = ['OMR', 'KWD', 'BHD'].includes(currency) ? 3 : 2;

    return `${Number(amount).toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`;
}

/** "1 branch", "3 branches". */
export function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}
