import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Reveal, SplitHeading } from '@/components/website/motion';
import { RichText } from '@/components/website/rich-text';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';
import { dateLabel, PostCard, t } from '@/pages/website/blog/index';
import type { PostSummary } from '@/pages/website/blog/index';
import type { Translations } from '@/types';

type Props = {
    page: { seo: Record<Lang, { title: string; description: string }>; sections: { type: string; content: Record<Lang, any> }[] };
    chrome: Chrome;
    post: PostSummary & { body: Translations | null };
    related: PostSummary[];
};

export default function BlogPost({ page, chrome, post, related }: Props) {
    const intro = page.sections.find((s) => s.type === 'intro');
    const seo = { en: { title: post.title.en ?? '', description: post.excerpt?.en ?? '' }, ar: { title: post.title.ar || post.title.en || '', description: post.excerpt?.ar || post.excerpt?.en || '' } };

    return (
        <SiteShell chrome={chrome} seo={seo} active="blog">
            {(lang) => {
                const c = pick(intro?.content, lang) as { title: string; read: string };
                const body = t(post.body, lang);
                return (
                    <>
                        {post.cover_url && <Head><meta property="og:image" content={post.cover_url} /></Head>}
                        <article className="mx-auto max-w-[760px] px-5 pb-16 pt-10 sm:px-6 md:pt-16">
                            <Link href="/blog" className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-muted-ink hover:text-ink"><ArrowLeft className="size-4 rtl:rotate-180" />{c.title}</Link>
                            {post.category && <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-forest">{post.category}</div>}
                            <SplitHeading as="h1" onScroll={false} rtl={lang === 'ar'} className="font-display text-[clamp(36px,5.5vw,56px)] font-extrabold leading-[1.04] tracking-[-0.03em]">{t(post.title, lang)}</SplitHeading>
                            <p className="mt-4 text-sm text-muted-ink">{dateLabel(post.published_at, lang)} · {post.minutes} {c.read}</p>
                            {post.cover_url && <Reveal><img src={post.cover_url} alt="" className="mt-9 aspect-[16/9] w-full rounded-[28px] object-cover" /></Reveal>}
                            {t(post.excerpt, lang) && <p className="mt-9 text-xl font-semibold leading-relaxed">{t(post.excerpt, lang)}</p>}
                            {body && <Reveal className="mt-7"><RichText source={body} /></Reveal>}
                        </article>
                        {related.length > 0 && (
                            <section className="border-t border-line bg-white">
                                <div className="px-5 py-16 sm:px-6 lg:px-10 xl:px-16">
                                    <h2 className="mb-8 font-display text-3xl font-extrabold">{lang === 'ar' ? 'اقرأ أيضاً' : 'Keep reading'}</h2>
                                    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                                        {related.map((p, i) => <PostCard key={p.slug} post={p} lang={lang} read={c.read} index={i} />)}
                                    </div>
                                </div>
                            </section>
                        )}
                    </>
                );
            }}
        </SiteShell>
    );
}
