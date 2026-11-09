import { Link } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';
import { useState } from 'react';
import { Reveal, SplitHeading } from '@/components/website/motion';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';
import { cn } from '@/lib/utils';
import type { Paginated, Translations } from '@/types';

export type PostSummary = { slug: string; title: Translations; excerpt: Translations | null; category: string | null; cover_url: string | null; is_featured: boolean; published_at: string | null; minutes: number };

type Props = {
    page: { seo: Record<Lang, { title: string; description: string }>; sections: { type: string; content: Record<Lang, any> }[] };
    chrome: Chrome;
    posts: Paginated<PostSummary>;
    categories: string[];
};

export const t = (v: Translations | null | undefined, lang: Lang) => (v ? v[lang] || v.en || '' : '');
export const dateLabel = (d: string | null, lang: Lang) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const COVERS = ['bg-saffron', 'bg-[#C9D7B8]', 'bg-ink-2', 'bg-[#E9C79A]', 'bg-forest', 'bg-[#D9B9A6]'];

export function PostCard({ post, lang, read, index }: { post: PostSummary; lang: Lang; read: string; index: number }) {
    return (
        <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-3">
            <div className={cn('aspect-[16/10] overflow-hidden rounded-[22px]', COVERS[index % COVERS.length])}>
                {post.cover_url && <img src={post.cover_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
            {post.category && <span className="text-xs font-bold uppercase tracking-wide text-forest">{post.category}</span>}
            <h3 className="font-display text-[23px] font-bold leading-tight tracking-tight group-hover:underline group-hover:underline-offset-4">{t(post.title, lang)}</h3>
            <span className="text-sm text-muted-ink">{dateLabel(post.published_at, lang)} · {post.minutes} {read}</span>
        </Link>
    );
}

export default function BlogIndex({ page, chrome, posts, categories }: Props) {
    const [category, setCategory] = useState<string | null>(null);
    const intro = page.sections.find((s) => s.type === 'intro');
    const featured = posts.current_page === 1 ? posts.data.find((p) => p.is_featured) : undefined;
    const rest = posts.data.filter((p) => p !== featured && (!category || p.category === category));

    return (
        <SiteShell chrome={chrome} seo={page.seo} active="blog">
            {(lang) => {
                const c = pick(intro?.content, lang) as { title: string; subtitle: string; empty: string; read: string };
                return (
                    <>
                        <section className="px-5 pb-10 pt-14 sm:px-6 lg:px-10 xl:px-16 md:pt-20">
                            <SplitHeading as="h1" onScroll={false} rtl={lang === 'ar'} className="mb-3 font-display text-[clamp(44px,7vw,68px)] font-extrabold leading-none tracking-[-0.035em]">{c.title}</SplitHeading>
                            <Reveal delay={0.2}><p className="text-lg text-muted-ink">{c.subtitle}</p></Reveal>
                        </section>

                        {posts.data.length === 0 && (
                            <section className="px-5 pb-24 sm:px-6 lg:px-10 xl:px-16">
                                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-white px-6 py-20 text-center text-muted-ink"><Newspaper className="size-9" />{c.empty}</div>
                            </section>
                        )}

                        {featured && (
                            <section className="px-5 pb-14 sm:px-6 lg:px-10 xl:px-16">
                                <Reveal>
                                    <Link href={`/blog/${featured.slug}`} className="group flex flex-wrap overflow-hidden rounded-[32px] bg-ink text-white">
                                        <div className="min-h-[300px] flex-[1_1_460px] bg-saffron">
                                            {featured.cover_url && <img src={featured.cover_url} alt="" className="size-full object-cover" />}
                                        </div>
                                        <div className="flex flex-[1_1_420px] flex-col justify-center gap-4 p-8 md:p-11">
                                            {featured.category && <span className="text-[13px] font-bold uppercase text-saffron">{featured.category}</span>}
                                            <h2 className="font-display text-[clamp(28px,3.5vw,40px)] font-extrabold leading-[1.05] tracking-tight group-hover:underline group-hover:underline-offset-4">{t(featured.title, lang)}</h2>
                                            {t(featured.excerpt, lang) && <p className="leading-relaxed text-[#CFCAC2]">{t(featured.excerpt, lang)}</p>}
                                            <span className="text-sm text-[#B5B0A8]">{dateLabel(featured.published_at, lang)} · {featured.minutes} {c.read}</span>
                                        </div>
                                    </Link>
                                </Reveal>
                            </section>
                        )}

                        {posts.data.length > 0 && (
                            <section className="px-5 pb-24 sm:px-6 lg:px-10 xl:px-16">
                                {categories.length > 1 && (
                                    <div className="mb-7 flex flex-wrap gap-2">
                                        {[null, ...categories].map((cat) => (
                                            <button key={cat ?? 'all'} type="button" onClick={() => setCategory(cat)} aria-pressed={category === cat} className={cn('h-10 rounded-full px-4 text-sm font-bold', category === cat ? 'bg-ink text-white' : 'border border-line-strong bg-white')}>
                                                {cat ?? (lang === 'ar' ? 'الكل' : 'All')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <Reveal stagger={0.07} className="grid gap-x-7 gap-y-11 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                    {rest.map((post, i) => <PostCard key={post.slug} post={post} lang={lang} read={c.read} index={i} />)}
                                </Reveal>
                                {posts.last_page > 1 && (
                                    <nav aria-label="Pagination" className="mt-12 flex flex-wrap justify-center gap-1">
                                        {posts.links.map((l, i) => l.url ? <Link key={i} href={l.url} className={cn('rounded-lg px-3.5 py-2 text-sm font-semibold', l.active ? 'bg-ink text-white' : 'bg-white')}>{l.label.replace(/&laquo;|&raquo;/g, '').trim()}</Link> : null)}
                                    </nav>
                                )}
                            </section>
                        )}
                    </>
                );
            }}
        </SiteShell>
    );
}
