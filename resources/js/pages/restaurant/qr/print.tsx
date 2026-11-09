import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { QrImage } from '@/components/qr/qr-image';
import { cn } from '@/lib/utils';

type Props = {
    codes: { id: number; code: string; table: string | null; branch: string | null }[];
    qrBaseUrl: string;
    qrRestaurant: { name: string; logo_url: string | null; languages: string[] };
};

/** Print-ready table cards. Use the browser's print dialog → "Save as PDF" for a PDF. */
export default function PrintCards({ codes, qrBaseUrl, qrRestaurant: restaurant }: Props) {
    const { brand } = usePage().props;
    const [withLogo, setWithLogo] = useState(Boolean(restaurant.logo_url));
    const bilingual = restaurant.languages.includes('ar') && restaurant.languages.length > 1;

    return (
        <div className="min-h-svh bg-sand text-ink print:bg-white">
            <Head title="Print table cards" />
            <style>{'@page { size: A4; margin: 10mm; } @media print { .card { break-inside: avoid; } }'}</style>

            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-white px-6 py-3 print:hidden">
                <span className="font-bold">{codes.length} card{codes.length === 1 ? '' : 's'} · A4, 6 per page</span>
                {restaurant.logo_url && (
                    <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} className="size-4 accent-forest" /> Logo in QR
                    </label>
                )}
                <span className="text-sm text-muted-ink">Tip: choose “Save as PDF” in the print dialog to get a print-ready PDF.</span>
                <button type="button" onClick={() => window.print()} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white">
                    <Printer className="size-4" /> Print / Save as PDF
                </button>
            </div>

            <div className="mx-auto grid max-w-[190mm] grid-cols-2 gap-[6mm] p-6 print:max-w-none print:p-0">
                {codes.map((c) => (
                    <article key={c.id} className="card flex h-[88mm] flex-col items-center justify-between rounded-[5mm] border border-line-strong bg-white p-[6mm] text-center">
                        <div className="flex items-center gap-2">
                            {restaurant.logo_url && <img src={restaurant.logo_url} alt="" className="size-8 rounded-lg object-cover" />}
                            <span className="font-display text-lg font-extrabold">{restaurant.name}</span>
                        </div>
                        <QrImage value={`${qrBaseUrl}/${c.code}`} style={{ logoUrl: withLogo ? restaurant.logo_url : null }} label={`QR code ${c.table ?? ''}`} className="w-[44mm]" />
                        <div>
                            <div className="text-[13px] font-extrabold">Scan for the menu{bilingual && <span className="font-arabic"> · امسح لعرض القائمة</span>}</div>
                            <div className={cn('mt-0.5 text-[11px] text-muted-ink')}>
                                {[c.branch, c.table].filter(Boolean).join(' · ')}
                            </div>
                            <div className="mt-1 text-[9px] text-muted-ink">{brand.name}</div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
