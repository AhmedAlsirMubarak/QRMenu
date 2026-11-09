import { usePage } from '@inertiajs/react';

export function BrandMark({ light = false }: { light?: boolean }) {
    const { brand } = usePage().props;

    return (
        <span className="flex items-center gap-2.5">
            {brand.logo ? (
                <img
                    src={brand.logo}
                    alt=""
                    className="size-8 rounded-[10px] object-cover"
                />
            ) : (
                <span className="grid size-8 place-items-center rounded-[10px] bg-saffron">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#14110F"
                        strokeWidth="2.4"
                        aria-hidden="true"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                        <path d="M14 14h3v3h-3zM20 20h1M17 20h1M20 17h1" />
                    </svg>
                </span>
            )}
            <span
                className={`font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
            >
                {brand.name}
            </span>
        </span>
    );
}
