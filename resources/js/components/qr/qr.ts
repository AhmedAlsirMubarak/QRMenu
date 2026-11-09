import QRCode from 'qrcode';

export type QrStyle = { dark?: string; light?: string; logoUrl?: string | null };

/** SVG markup for a QR code (high error correction so a centre logo still scans). */
export async function qrSvg(text: string, style: QrStyle = {}): Promise<string> {
    const svg = await QRCode.toString(text, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 2,
        color: { dark: style.dark ?? '#14110F', light: style.light ?? '#FFFFFF' },
    });

    if (!style.logoUrl) return svg;

    // Embed the logo in a white rounded box covering ~22% of the code.
    const size = Number(/viewBox="0 0 (\d+)/.exec(svg)?.[1] ?? 0);
    const box = size * 0.22;
    const pos = (size - box) / 2;
    const logo = await toDataUrl(style.logoUrl).catch(() => null);
    if (!logo) return svg;

    const overlay = `<rect x="${pos - 0.6}" y="${pos - 0.6}" width="${box + 1.2}" height="${box + 1.2}" rx="1.2" fill="${style.light ?? '#FFFFFF'}"/><image href="${logo}" x="${pos}" y="${pos}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid slice"/>`;

    return svg.replace('</svg>', `${overlay}</svg>`);
}

/** High-resolution PNG (data URL) rendered from the SVG. */
export async function qrPng(text: string, style: QrStyle = {}, px = 1200): Promise<string> {
    const svg = await qrSvg(text, style);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, px, px);

    return canvas.toDataURL('image/png');
}

export function download(href: string, filename: string): void {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

export async function downloadSvg(text: string, style: QrStyle, filename: string): Promise<void> {
    const svg = await qrSvg(text, style);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    download(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPng(text: string, style: QrStyle, filename: string): Promise<void> {
    download(await qrPng(text, style), filename);
}

async function toDataUrl(url: string): Promise<string> {
    const blob = await (await fetch(url, { credentials: 'same-origin' })).blob();

    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function fileSafe(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/gi, '-').replace(/^-|-$/g, '') || 'qr';
}
