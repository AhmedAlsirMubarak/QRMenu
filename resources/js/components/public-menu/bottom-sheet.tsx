import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/** Mobile-first bottom sheet (centered dialog on wide screens). Escape and backdrop close it. */
export function BottomSheet({ open, onClose, label, closeLabel, children }: { open: boolean; onClose: () => void; label: string; closeLabel: string; children: ReactNode }) {
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        panel.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            previous?.focus();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
            <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-black/50 animate-in fade-in" />
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[var(--surface)] text-[var(--ink)] shadow-2xl outline-none animate-in slide-in-from-bottom-8 sm:rounded-[28px]"
            >
                <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute end-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-[var(--surface)]/90 shadow">
                    <X className="size-5" />
                </button>
                {children}
            </div>
        </div>
    );
}
