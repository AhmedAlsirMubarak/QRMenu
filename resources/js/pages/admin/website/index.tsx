import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Btn } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';

type Lang = 'en' | 'ar';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Section = { type: string; enabled: boolean; content: Record<Lang, Record<string, any>> };
type PageContent = { seo: Record<Lang, { title?: string; description?: string }>; sections: Section[] };
type FormShape = { seo: Record<Lang, { title?: string; description?: string }>; sections: Section[] };

type Props = { slug: string; pages: string[]; page: PageContent; defaults: PageContent };

const PAGE_LABELS: Record<string, string> = { home: 'Home', marketplace: 'Marketplace', clients: 'Our clients', blog: 'Blog', contact: 'Contact', terms: 'Terms of Service' };
const PAGE_URLS: Record<string, string> = { home: '/', marketplace: '/marketplace', clients: '/clients', blog: '/blog', contact: '/contact', terms: '/terms' };
const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero', highlights: 'Highlights strip', features: 'Features grid', how: 'How it works', clients: 'Our clients',
    pricing: 'Pricing (plans come from Plans)', faq: 'FAQ', cta: 'Call to action', intro: 'Page intro', advertise: 'Advertise with us box', legal: 'Terms text', contact: 'Contact form & details',
};
const LONG_FIELDS = ['subtitle', 'text', 'a', 'description', 'intro', 'success_text'];
const humanize = (key: string) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function WebsiteCms({ slug, pages, page, defaults }: Props) {
    const form = useForm<FormShape>({ seo: page.seo, sections: page.sections });
    const [open, setOpen] = useState<string>(page.sections[0]?.type ?? '');
    const defaultsByType = Object.fromEntries(defaults.sections.map((s) => [s.type, s]));

    const updateSection = (i: number, next: Section) => form.setData('sections', form.data.sections.map((s, j) => (j === i ? next : s)));
    const move = (i: number, dir: -1 | 1) => {
        const list = [...form.data.sections];
        const t = i + dir;
        if (t < 0 || t >= list.length) return;
        [list[i], list[t]] = [list[t], list[i]];
        form.setData('sections', list);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/admin/website/${slug}`, { preserveScroll: true });
    };

    const reset = () => {
        if (window.confirm(`Reset the ${PAGE_LABELS[slug]} page to the original text? Your edits will be lost.`)) {
            router.delete(`/admin/website/${slug}`, { preserveScroll: true, onSuccess: () => window.location.reload() });
        }
    };

    return (
        <>
            <Head title="Website CMS" />
            <PageHeader
                title="Website"
                description="Edit the public pages in English and Arabic. Pricing comes from Plans; client cards from Restaurants › “On website”."
                actions={
                    <>
                        <a href={PAGE_URLS[slug]} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold">View page <ExternalLink className="size-4" /></a>
                        <Link href="/admin/blog" className="inline-flex h-11 items-center rounded-xl border border-line-strong bg-white px-4 text-sm font-bold">Blog posts</Link>
                    </>
                }
            />

            <div role="tablist" aria-label="Pages" className="mb-5 flex flex-wrap gap-1.5 border-b border-[#E0DDD6]">
                {pages.map((p) => (
                    <Link key={p} href={`/admin/website?page=${p}`} role="tab" aria-selected={p === slug} className={cn('h-11 px-4 text-sm leading-[44px]', p === slug ? 'border-b-2 border-ink font-extrabold' : 'font-semibold text-muted-ink')}>
                        {PAGE_LABELS[p] ?? p}
                    </Link>
                ))}
            </div>

            {slug === 'terms' && (
                <p className="mb-4 rounded-xl bg-saffron-soft px-4 py-3 text-sm">
                    Write <code className="rounded bg-white px-1 font-bold">{'{brand}'}</code> for your brand name and <code className="rounded bg-white px-1 font-bold">{'{email}'}</code> for the support email (both from Settings). Use “Add” under Items for a new clause, and update the “Updated” date when you change the terms. Have a lawyer review the final text.
                </p>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4">
                {form.data.sections.map((section, i) => {
                    const isOpen = open === section.type;
                    return (
                        <section key={section.type} className={cn('rounded-2xl border bg-white', isOpen ? 'border-forest' : 'border-line')}>
                            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                                <button type="button" onClick={() => setOpen(isOpen ? '' : section.type)} className="min-h-10 flex-1 text-start font-bold" aria-expanded={isOpen}>
                                    {SECTION_LABELS[section.type] ?? humanize(section.type)}
                                    {!section.enabled && <span className="ms-2 rounded bg-[#F1F0EC] px-1.5 py-0.5 text-[11px] font-bold text-muted-ink">Hidden</span>}
                                </button>
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                    <input type="checkbox" checked={section.enabled} onChange={(e) => updateSection(i, { ...section, enabled: e.target.checked })} className="size-[18px] accent-forest" />
                                    Show
                                </label>
                                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-9 place-items-center rounded-lg disabled:opacity-25" aria-label="Move up"><ArrowUp className="size-4" /></button>
                                <button type="button" onClick={() => move(i, 1)} disabled={i === form.data.sections.length - 1} className="grid size-9 place-items-center rounded-lg disabled:opacity-25" aria-label="Move down"><ArrowDown className="size-4" /></button>
                            </div>
                            {isOpen && (
                                <div className="grid gap-5 border-t border-line p-4 lg:grid-cols-2">
                                    {(['en', 'ar'] as Lang[]).map((lang) => (
                                        <fieldset key={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={cn('flex flex-col gap-3 rounded-xl bg-paper p-4', lang === 'ar' && 'font-arabic')}>
                                            <legend className="mb-1 text-xs font-bold text-muted-ink">{lang === 'en' ? 'ENGLISH' : 'العربية'}</legend>
                                            <Fields
                                                value={section.content[lang] ?? {}}
                                                shape={defaultsByType[section.type]?.content[lang] ?? section.content[lang]}
                                                onChange={(v) => updateSection(i, { ...section, content: { ...section.content, [lang]: v as Record<string, unknown> } })}
                                            />
                                        </fieldset>
                                    ))}
                                </div>
                            )}
                        </section>
                    );
                })}

                <section className="rounded-2xl border border-line bg-white p-4">
                    <h2 className="mb-3 font-bold">Search engines &amp; sharing</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {(['en', 'ar'] as Lang[]).map((lang) => (
                            <div key={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col gap-2.5">
                                <TextField label={lang === 'en' ? 'Title' : 'العنوان'} value={form.data.seo[lang]?.title ?? ''} onChange={(v) => form.setData('seo', { ...form.data.seo, [lang]: { ...form.data.seo[lang], title: v } })} />
                                <TextField long label={lang === 'en' ? 'Description' : 'الوصف'} value={form.data.seo[lang]?.description ?? ''} onChange={(v) => form.setData('seo', { ...form.data.seo, [lang]: { ...form.data.seo[lang], description: v } })} />
                            </div>
                        ))}
                    </div>
                </section>

                <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/95 p-3 backdrop-blur">
                    <Btn type="submit" variant="forest" disabled={form.processing || !form.isDirty}>{form.processing ? 'Publishing…' : 'Publish changes'}</Btn>
                    {form.isDirty && <span className="text-sm font-semibold text-muted-ink">Unpublished changes</span>}
                    {Object.keys(form.errors).length > 0 && <span className="text-sm font-semibold text-clay">Some fields are invalid.</span>}
                    <button type="button" onClick={reset} className="ms-auto inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-muted-ink hover:bg-paper"><RotateCcw className="size-4" />Reset to original</button>
                </div>
            </form>
        </>
    );
}

/** Renders inputs following the default content's shape: strings → inputs, lists → repeatable rows. */
function Fields({ value, shape, onChange }: { value: unknown; shape: unknown; onChange: (v: unknown) => void }) {
    if (typeof shape === 'string') {
        return <TextField label="" value={String(value ?? '')} onChange={onChange} />;
    }

    if (Array.isArray(shape)) {
        const list = Array.isArray(value) ? value : [];
        const item = shape[0] ?? '';
        const blank = typeof item === 'string' ? '' : Object.fromEntries(Object.keys(item as object).map((k) => [k, '']));
        return (
            <div className="flex flex-col gap-2">
                {list.map((entry, i) => (
                    <div key={i} className={cn('flex gap-2', typeof item !== 'string' && 'rounded-xl border border-line bg-white p-3')}>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            {typeof item === 'string' ? (
                                <TextField label="" value={String(entry ?? '')} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} />
                            ) : (
                                Object.keys(item as object).map((key) => (
                                    <TextField key={key} long={LONG_FIELDS.includes(key)} label={key === 'q' ? 'Question' : key === 'a' ? 'Answer' : humanize(key)} value={String((entry as Record<string, unknown>)?.[key] ?? '')} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...(x as object), [key]: v } : x)))} />
                                ))
                            )}
                        </div>
                        <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label="Remove"><Trash2 className="size-4" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => onChange([...list, blank])} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-line-strong px-3 text-sm font-bold"><Plus className="size-4" />Add</button>
            </div>
        );
    }

    if (shape && typeof shape === 'object') {
        const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
        return (
            <>
                {Object.entries(shape as Record<string, unknown>).map(([key, sub]) =>
                    typeof sub === 'string' ? (
                        <TextField key={key} long={LONG_FIELDS.includes(key)} label={humanize(key)} value={String(obj[key] ?? '')} onChange={(v) => onChange({ ...obj, [key]: v })} />
                    ) : (
                        <div key={key} className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-bold">{humanize(key)}</span>
                            <Fields value={obj[key]} shape={sub} onChange={(v) => onChange({ ...obj, [key]: v })} />
                        </div>
                    ),
                )}
            </>
        );
    }

    return null;
}

function TextField({ label, value, onChange, long = false }: { label: string; value: string; onChange: (v: string) => void; long?: boolean }) {
    const cls = 'w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20';
    const input = long
        ? <textarea rows={Math.min(12, Math.max(3, Math.ceil(value.length / 80)))} value={value} onChange={(e) => onChange(e.target.value)} className={cn(cls, 'resize-y py-2')} aria-label={label || undefined} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} className={cn(cls, 'h-10')} aria-label={label || undefined} />;

    return label ? <label className="flex flex-col gap-1.5 text-[13px] font-bold">{label}{input}</label> : input;
}
