import { Check, Download, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/public-menu/bottom-sheet';
import { CameraCapture } from '@/components/public-menu/camera-capture';
import type { GuestItem } from '@/components/public-menu/sheets';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

export type PlateStoryConfig = { ask_after_photo: boolean; card_styles: string[]; caption: Translations; reward: Translations | null };

type Props = {
    open: boolean;
    onClose: () => void;
    config: PlateStoryConfig;
    lang: string;
    rtl: boolean;
    restaurant: { name: string; slug: string; instagram: string | null; logo_url: string | null };
    branch: { id: number; area: string | null; city: string | null; name: string };
    items: GuestItem[];
    text: (v: Translations | null | undefined) => string;
    brandName: string;
    onShared: (storyId: number) => void;
};

type Step = 'before' | 'after' | 'card' | 'share';

const T = {
    en: {
        title: 'Plate Story', arrived: 'Your dish just arrived?', arrivedText: 'Snap it now — you’ll get a story card for Instagram.', choose: 'Which dish?', none: 'Not on the list',
        takePhoto: 'Take a photo', retake: 'Retake', openCamera: 'Open camera', capture: 'Take photo', upload: 'Upload a photo instead', switchCamera: 'Switch camera',
        cameraBlocked: 'Camera access is blocked. Allow it in your browser settings, or upload a photo.', cameraUnavailable: 'The camera isn’t available here — upload a photo instead.', next: 'Next', cleanPlate: 'Clean plate?', cleanText: 'Add an “after” photo — or skip it.', skip: 'Skip', pick: 'Pick a design',
        create: 'Create my story', creating: 'Creating…', share: 'Share to Instagram & more', save: 'Save image', whatsapp: 'WhatsApp', thanks: 'Thanks for sharing!',
        show: 'Show this code to staff', valid: 'Valid until', before: 'BEFORE', after: 'AFTER', error: 'Something went wrong. Please try again.', tip: 'Tip: in the share menu choose Instagram → Story.',
    },
    ar: {
        title: 'قصة الطبق', arrived: 'وصل طبقك؟', arrivedText: 'التقط صورة الآن واحصل على بطاقة قصة لإنستغرام.', choose: 'أي طبق؟', none: 'غير موجود في القائمة',
        takePhoto: 'التقط صورة', retake: 'إعادة', openCamera: 'افتح الكاميرا', capture: 'التقط', upload: 'أو ارفع صورة', switchCamera: 'تبديل الكاميرا',
        cameraBlocked: 'تم حظر الوصول إلى الكاميرا. اسمح به من إعدادات المتصفح أو ارفع صورة.', cameraUnavailable: 'الكاميرا غير متاحة هنا — ارفع صورة بدلاً من ذلك.', next: 'التالي', cleanPlate: 'الطبق فارغ؟', cleanText: 'أضف صورة "بعد" — أو تخطَّ.', skip: 'تخطي', pick: 'اختر التصميم',
        create: 'أنشئ قصتي', creating: 'جارٍ الإنشاء…', share: 'شارك على إنستغرام وغيره', save: 'حفظ الصورة', whatsapp: 'واتساب', thanks: 'شكراً للمشاركة!',
        show: 'اعرض هذا الرمز على الموظفين', valid: 'صالح حتى', before: 'قبل', after: 'بعد', error: 'حدث خطأ. حاول مرة أخرى.', tip: 'نصيحة: من قائمة المشاركة اختر إنستغرام ← القصة.',
    },
};

export function PlateStorySheet({ open, onClose, config, lang, rtl, restaurant, branch, items, text, brandName, onShared }: Props) {
    const t = lang === 'ar' ? T.ar : T.en;
    const [step, setStep] = useState<Step>('before');
    const [itemId, setItemId] = useState<number | ''>('');
    const [before, setBefore] = useState<Blob | null>(null);
    const [after, setAfter] = useState<Blob | null>(null);
    const [style, setStyle] = useState(config.card_styles[0] ?? 'dark');
    const [card, setCard] = useState<Blob | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ id: number; reward: { code: string; text: Translations; expires_at: string } | null } | null>(null);

    const beforeUrl = useObjectUrl(before);
    const afterUrl = useObjectUrl(after);
    const cardUrl = useObjectUrl(card);
    const item = items.find((i) => i.id === itemId) ?? null;
    const menuLink = `${window.location.host}/${restaurant.slug}`;

    useEffect(() => {
        if (!open) {
            setStep('before'); setBefore(null); setAfter(null); setCard(null); setResult(null); setError(null); setItemId('');
        }
    }, [open]);

    // Re-draw the card when its inputs change.
    useEffect(() => {
        if (step !== 'card' || !before) return;
        let alive = true;
        void drawCard({ before, after, style, rtl, restaurantName: restaurant.name, instagram: restaurant.instagram, place: branch.area || branch.city || branch.name, dish: item ? text(item.name) : '', caption: text(config.caption), labels: [t.before, t.after], link: menuLink, brandName })
            .then((blob) => alive && setCard(blob));
        return () => { alive = false; };
    }, [step, before, after, style, rtl, item, restaurant, branch, config.caption, text, t, menuLink, brandName]);

    const create = async () => {
        if (!before || !card) return;
        setBusy(true);
        setError(null);
        const body = new FormData();
        body.append('branch_id', String(branch.id));
        if (itemId) body.append('menu_item_id', String(itemId));
        body.append('style', style);
        // Upload small copies only (the sharp originals stay on the phone for the story card).
        const small = async (photo: Blob, name: string) => {
            const out = await forUpload(photo);
            body.append(name, out, `${name}.${out.type === 'image/webp' ? 'webp' : 'jpg'}`);
        };
        await small(before, 'before');
        if (after) await small(after, 'after');

        try {
            const response = await fetch(`/${restaurant.slug}/plate-story`, {
                method: 'POST',
                body,
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
            });
            if (!response.ok) throw new Error(String(response.status));
            setResult(await response.json());
            setStep('share');
        } catch {
            setError(t.error);
        } finally {
            setBusy(false);
        }
    };

    const share = async () => {
        if (!card || !result) return;
        const file = new File([card], `${restaurant.slug}-story.jpg`, { type: 'image/jpeg' });
        const shareUrl = `${window.location.origin}/${restaurant.slug}?src=story`;
        try {
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], text: `${restaurant.name}${restaurant.instagram ? ` @${restaurant.instagram}` : ''}` });
            } else if (navigator.share) {
                await navigator.share({ title: restaurant.name, url: shareUrl });
            } else {
                download(cardUrl, file.name);
            }
            onShared(result.id);
        } catch { /* user cancelled */ }
    };

    return (
        <BottomSheet open={open} onClose={onClose} label={t.title} closeLabel="×">
            <div className="flex flex-col gap-4 p-5 pt-6">
                <div className="flex items-center gap-2 pe-12">
                    <h2 className="font-display text-2xl font-extrabold">{step === 'after' ? t.cleanPlate : step === 'share' ? t.thanks : step === 'card' ? t.pick : t.arrived}</h2>
                    <span className="ms-auto flex gap-1" aria-hidden>
                        {(['before', 'after', 'card', 'share'] as Step[]).filter((s) => s !== 'after' || config.ask_after_photo).map((s, i, all) => (
                            <span key={s} className={cn('h-1.5 w-5 rounded-full', all.indexOf(step) >= i ? 'bg-[var(--active)]' : 'bg-[var(--line)]')} />
                        ))}
                    </span>
                </div>

                {step === 'before' && (
                    <>
                        <p className="-mt-2 text-[var(--muted)]">{t.arrivedText}</p>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            {t.choose}
                            <select value={itemId} onChange={(e) => setItemId(e.target.value ? Number(e.target.value) : '')} className="h-12 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-3 text-[15px]">
                                <option value="">{t.none}</option>
                                {items.map((i) => <option key={i.id} value={i.id}>{text(i.name)}</option>)}
                            </select>
                        </label>
                        <CameraCapture url={beforeUrl} labels={t} onPhoto={async (f) => setBefore(await shrink(f))} />
                        <button type="button" disabled={!before} onClick={() => setStep(config.ask_after_photo ? 'after' : 'card')} className="h-14 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)] disabled:opacity-40">{t.next}</button>
                    </>
                )}

                {step === 'after' && (
                    <>
                        <p className="-mt-2 text-[var(--muted)]">{t.cleanText}</p>
                        <CameraCapture url={afterUrl} labels={t} onPhoto={async (f) => setAfter(await shrink(f))} />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setAfter(null); setStep('card'); }} className="h-14 flex-1 rounded-full border border-[var(--line)] font-bold">{t.skip}</button>
                            <button type="button" disabled={!after} onClick={() => setStep('card')} className="h-14 flex-1 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)] disabled:opacity-40">{t.next}</button>
                        </div>
                    </>
                )}

                {step === 'card' && (
                    <>
                        <div className="mx-auto aspect-[9/16] w-56 overflow-hidden rounded-2xl bg-[var(--chip)] shadow-lg">
                            {cardUrl && <img src={cardUrl} alt="Story card preview" className="size-full object-cover" />}
                        </div>
                        {config.card_styles.length > 1 && (
                            <div role="radiogroup" aria-label={t.pick} className="flex justify-center gap-2">
                                {config.card_styles.map((s) => (
                                    <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)} className={cn('h-10 rounded-full px-4 text-sm font-bold capitalize', style === s ? 'bg-[var(--active)] text-[var(--active-ink)]' : 'bg-[var(--chip)]')}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        {error && <p className="text-center text-sm font-semibold text-[var(--bad)]">{error}</p>}
                        <button type="button" disabled={!card || busy} onClick={() => void create()} className="h-14 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)] disabled:opacity-50">{busy ? t.creating : t.create}</button>
                    </>
                )}

                {step === 'share' && result && (
                    <>
                        <div className="mx-auto aspect-[9/16] w-44 overflow-hidden rounded-2xl shadow-lg">{cardUrl && <img src={cardUrl} alt="" className="size-full object-cover" />}</div>
                        <button type="button" onClick={() => void share()} className="flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--active)] font-bold text-[var(--active-ink)]"><Share2 className="size-5" />{t.share}</button>
                        <p className="-mt-2 text-center text-xs text-[var(--muted)]">{t.tip}</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { download(cardUrl, `${restaurant.slug}-story.jpg`); onShared(result.id); }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--line)] font-bold"><Download className="size-4" />{t.save}</button>
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`${restaurant.name} — ${window.location.origin}/${restaurant.slug}?src=story`)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => onShared(result.id)}
                                className="flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--line)] font-bold"
                            >
                                {t.whatsapp}
                            </a>
                        </div>
                        {result.reward && (
                            <div className="rounded-2xl bg-[var(--chip)] p-4 text-center">
                                <div className="font-bold">{text(result.reward.text)}</div>
                                <div className="mt-1 text-sm text-[var(--muted)]">{t.show}</div>
                                <div className="mt-2 font-mono text-3xl font-extrabold tracking-widest" dir="ltr">{result.reward.code}</div>
                                <div className="mt-1 text-xs text-[var(--muted)]">{t.valid} {result.reward.expires_at}</div>
                            </div>
                        )}
                        <button type="button" onClick={onClose} className="mx-auto inline-flex items-center gap-1 text-sm font-bold text-[var(--muted)]"><Check className="size-4" />OK</button>
                    </>
                )}
            </div>
        </BottomSheet>
    );
}

function useObjectUrl(blob: Blob | null): string | null {
    const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
    return url;
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function download(url: string | null, name: string) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
}

/** Phone photos can be 10 MB+: re-encode to max 1600px JPEG (kept on the phone to draw a sharp story card). */
async function shrink(file: Blob, max = 1600): Promise<Blob> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}

const STYLE_COLORS: Record<string, { bg: string; ink: string; muted: string; accent: string; tag: string; tagInk: string }> = {
    dark: { bg: '#14110F', ink: '#FFFFFF', muted: '#B5B0A8', accent: '#F2B33D', tag: '#FFFFFF', tagInk: '#14110F' },
    saffron: { bg: '#F2B33D', ink: '#14110F', muted: '#5F4630', accent: '#14110F', tag: '#14110F', tagInk: '#FFFFFF' },
    minimal: { bg: '#FAFAF8', ink: '#14110F', muted: '#5F5B55', accent: '#0E4D3F', tag: '#14110F', tagInk: '#FFFFFF' },
};

/**
 * The copy that is uploaded: max 1080px WebP (about 100–150 KB). Browsers that can't make WebP (older Safari)
 * fall back to JPEG. Re-drawing on a canvas also removes hidden photo data such as the GPS location.
 */
async function forUpload(file: Blob, max = 1080): Promise<Blob> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    const webp = await encode('image/webp', 0.78);
    if (webp && webp.type === 'image/webp') return webp;
    return (await encode('image/jpeg', 0.8)) ?? file;
}

/** Draws the 1080×1920 story card. */
export async function drawCard(o: { before: Blob; after: Blob | null; style: string; rtl: boolean; restaurantName: string; instagram: string | null; place: string; dish: string; caption: string; labels: [string, string]; link: string; brandName: string }): Promise<Blob> {
    const W = 1080, H = 1920, P = 72;
    const c = STYLE_COLORS[o.style] ?? STYLE_COLORS.dark;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const display = `'Bricolage Grotesque', 'IBM Plex Sans Arabic', system-ui, sans-serif`;
    const body = `'Manrope', 'IBM Plex Sans Arabic', system-ui, sans-serif`;
    await document.fonts?.ready;

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.direction = o.rtl ? 'rtl' : 'ltr';
    ctx.textAlign = o.rtl ? 'right' : 'left';
    const x = o.rtl ? W - P : P;

    // Header
    ctx.fillStyle = c.ink;
    ctx.font = `800 60px ${display}`;
    ctx.fillText(o.restaurantName, x, 170, W - P * 2);
    ctx.fillStyle = c.muted;
    ctx.font = `600 38px ${body}`;
    // \u2066…\u2069 keeps “@handle” left-to-right inside Arabic text.
    ctx.fillText([o.instagram ? `\u2066@${o.instagram}\u2069` : null, o.place].filter(Boolean).join('  ·  '), x, 230, W - P * 2);

    // Photos
    const top = 300, h = 1020, gap = 20;
    const before = await createImageBitmap(o.before);
    const after = o.after ? await createImageBitmap(o.after) : null;
    if (after) {
        const w = (W - P * 2 - gap) / 2;
        const [first, second] = o.rtl ? [after, before] : [before, after];
        const [l1, l2] = o.rtl ? [o.labels[1], o.labels[0]] : o.labels;
        drawCover(ctx, first, P, top, w, h, 40);
        drawCover(ctx, second, P + w + gap, top, w, h, 40);
        // The AFTER tag is highlighted; in Arabic the after photo sits on the left.
        drawTag(ctx, l1, P + 28, top + 28, c, body, o.rtl);
        drawTag(ctx, l2, P + w + gap + 28, top + 28, c, body, !o.rtl);
    } else {
        drawCover(ctx, before, P, top, W - P * 2, h, 40);
    }

    // Dish + caption
    ctx.textAlign = o.rtl ? 'right' : 'left';
    let y = top + h + 140;
    if (o.dish) {
        ctx.fillStyle = c.ink;
        ctx.font = `800 92px ${display}`;
        y = wrap(ctx, o.dish, x, y, W - P * 2, 100, 2);
    }
    if (o.caption) {
        ctx.fillStyle = c.accent;
        ctx.font = `800 64px ${display}`;
        wrap(ctx, o.caption, x, y + (o.dish ? 30 : 0), W - P * 2, 76, 2);
    }

    // Footer
    ctx.fillStyle = c.muted;
    ctx.font = `600 32px ${body}`;
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(o.link, P, H - 90, W / 2);
    ctx.textAlign = 'right';
    ctx.fillText(`via ${o.brandName}`, W - P, H - 90);

    // JPEG instead of PNG: about 5× smaller, so sharing to Instagram/WhatsApp is quicker.
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, r: number) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
    ctx.restore();
}

function drawTag(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, c: (typeof STYLE_COLORS)[string], font: string, accent = false) {
    ctx.save();
    ctx.direction = 'inherit';
    ctx.font = `800 30px ${font}`;
    const w = ctx.measureText(label).width + 44;
    ctx.fillStyle = accent ? '#F2B33D' : c.tag;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 56, 28);
    ctx.fill();
    ctx.fillStyle = accent ? '#14110F' : c.tagInk;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 39);
    ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
    const words = text.split(/\s+/);
    let line = '';
    let lines = 0;
    for (let i = 0; i < words.length; i++) {
        const test = line ? `${line} ${words[i]}` : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(lines === maxLines - 1 ? `${line}…` : line, x, y);
            if (++lines >= maxLines) return y + lineHeight;
            line = words[i];
            y += lineHeight;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
}
