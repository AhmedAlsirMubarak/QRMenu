import { useEffect, useState } from 'react';
import { qrSvg } from '@/components/qr/qr';
import type { QrStyle } from '@/components/qr/qr';
import { cn } from '@/lib/utils';

/** Renders a QR code inline as SVG. */
export function QrImage({ value, style, className, label }: { value: string; style?: QrStyle; className?: string; label: string }) {
    const [svg, setSvg] = useState<string | null>(null);
    const dark = style?.dark;
    const light = style?.light;
    const logoUrl = style?.logoUrl;

    useEffect(() => {
        let alive = true;
        void qrSvg(value, { dark, light, logoUrl }).then((s) => alive && setSvg(s));
        return () => { alive = false; };
    }, [value, dark, light, logoUrl]);

    return (
        <div
            role="img"
            aria-label={label}
            className={cn('aspect-square [&>svg]:size-full', !svg && 'animate-pulse rounded-lg bg-[#F1F0EC]', className)}
            // SVG is generated locally by the qrcode library from our own URL — not user HTML.
            dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
    );
}
