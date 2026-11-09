import { usePage } from '@inertiajs/react';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';

type Legal = { title: string; updated: string; intro: string; items: { title: string; text: string }[] };
type Props = {
    page: { seo: Record<Lang, { title?: string; description?: string }>; sections: { type: string; enabled: boolean; content: Record<Lang, Legal> }[] };
    chrome: Chrome;
    contactEmail: string | null;
};

/** Terms of Service — the text is edited in Admin › Website CMS › Terms of Service. */
export default function Terms({ page, chrome, contactEmail }: Props) {
    const { brand } = usePage().props;
    const section = page.sections.find((s) => s.type === 'legal');
    const fill = (text: string | undefined) =>
        (text ?? '').replaceAll('{brand}', brand.name).replaceAll('{email}', contactEmail ?? (brand.name ? `${brand.name} support` : 'support'));

    return (
        <SiteShell chrome={chrome} seo={page.seo} active="terms">
            {(lang) => {
                const c = pick(section?.content, lang) as Partial<Legal>;
                const items = (c.items ?? []).filter((i) => i.title || i.text);

                return (
                    <article className="mx-auto max-w-[820px] px-5 pb-24 pt-12 sm:px-6 md:pt-16">
                        <header className="mb-10 border-b border-line pb-8">
                            <h1 className="font-display text-[clamp(38px,6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{fill(c.title)}</h1>
                            {c.updated && <p className="mt-3 text-sm font-semibold text-muted-ink">{fill(c.updated)}</p>}
                            {c.intro && <p className="mt-6 whitespace-pre-line text-[17px] leading-relaxed text-ink/85">{fill(c.intro)}</p>}
                        </header>

                        {items.length > 3 && (
                            <nav aria-label={lang === 'ar' ? 'المحتويات' : 'Contents'} className="mb-10 rounded-2xl bg-sand p-5">
                                <ol className="grid gap-x-6 gap-y-1.5 text-sm font-semibold sm:grid-cols-2">
                                    {items.map((item, i) => (
                                        <li key={i}><a href={`#term-${i + 1}`} className="text-muted-ink hover:text-ink">{fill(item.title)}</a></li>
                                    ))}
                                </ol>
                            </nav>
                        )}

                        <div className="flex flex-col gap-8">
                            {items.map((item, i) => (
                                <section key={i} id={`term-${i + 1}`} className="scroll-mt-24">
                                    {item.title && <h2 className="mb-2.5 font-display text-[22px] font-bold tracking-tight">{fill(item.title)}</h2>}
                                    {item.text && <p className="whitespace-pre-line text-[16px] leading-[1.75] text-ink/80">{fill(item.text)}</p>}
                                </section>
                            ))}
                        </div>
                    </article>
                );
            }}
        </SiteShell>
    );
}
