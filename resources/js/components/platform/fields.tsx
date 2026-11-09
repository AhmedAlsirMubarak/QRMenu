import type {
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export function Field({
    label,
    error,
    children,
    className,
}: {
    label: ReactNode;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label
            className={cn(
                'flex flex-col gap-1.5 text-[13px] font-bold',
                className,
            )}
        >
            {label}
            {children}
            {error && (
                <span className="text-xs font-semibold text-clay">{error}</span>
            )}
        </label>
    );
}

export function TextInput({
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn(
                'h-[42px] rounded-[10px] border border-line-strong bg-white px-3 text-sm font-medium outline-none focus:border-forest focus:ring-2 focus:ring-forest/20',
                className,
            )}
        />
    );
}

export function SelectInput({
    className,
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cn(
                'h-[42px] rounded-[10px] border border-line-strong bg-white px-2.5 text-sm font-medium outline-none focus:border-forest focus:ring-2 focus:ring-forest/20',
                className,
            )}
        >
            {children}
        </select>
    );
}

export function CheckRow({
    checked,
    onChange,
    children,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    children: ReactNode;
}) {
    return (
        <label className="flex min-h-9 items-center gap-2.5 text-sm font-semibold">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="size-[18px] accent-forest"
            />
            {children}
        </label>
    );
}

export function Btn({
    variant = 'dark',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'dark' | 'forest' | 'outline' | 'danger';
}) {
    return (
        <button
            type="button"
            {...props}
            className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-50',
                variant === 'dark' && 'bg-ink text-white hover:bg-ink-2',
                variant === 'forest' &&
                    'bg-forest text-white hover:bg-forest-deep',
                variant === 'outline' &&
                    'border border-line-strong bg-white text-ink hover:bg-paper',
                variant === 'danger' &&
                    'border border-[#F0D2C4] bg-clay-soft text-clay hover:bg-[#ffe9df]',
                className,
            )}
        />
    );
}
