import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

const decode = (label: string) => label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');

export function Pager<T>({ page }: { page: Paginated<T> }) {
    if (page.last_page <= 1) return null;

    return (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap gap-1.5">
            {page.links.map((l, i) =>
                l.url ? (
                    <Link key={i} href={l.url} preserveScroll className={cn('grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-bold', l.active ? 'bg-ink text-white' : 'border border-line-strong bg-white')}>
                        {decode(l.label)}
                    </Link>
                ) : (
                    <span key={i} className="grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm text-muted-ink">{decode(l.label)}</span>
                ),
            )}
        </nav>
    );
}
