import { Head, Link } from '@inertiajs/react';
import { ExternalLink, Plus, Star } from 'lucide-react';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';
import type { Translations } from '@/types';

type Post = { id: number; slug: string; title: Translations; category: string | null; is_featured: boolean; published_at: string | null; cover_url: string | null };

const status = (p: Post) => (!p.published_at ? 'Draft' : new Date(p.published_at) > new Date() ? 'Scheduled' : 'Published');

export default function BlogPosts({ posts }: { posts: Post[] }) {
    return (
        <>
            <Head title="Blog posts" />
            <PageHeader
                title="Blog posts"
                description="Articles on the public blog, in English and Arabic."
                actions={<Link href="/admin/blog/create" className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white"><Plus className="size-4" />New post</Link>}
            />
            <section className="overflow-hidden rounded-2xl border border-line bg-white">
                {posts.length === 0 && <p className="px-5 py-14 text-center text-muted-ink">No posts yet. Write your first article.</p>}
                <ul>
                    {posts.map((p) => (
                        <li key={p.id} className="flex items-center gap-4 border-t border-[#F1F0EC] px-5 py-3.5 first:border-t-0">
                            <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-saffron-soft">{p.cover_url && <img src={p.cover_url} alt="" className="size-full object-cover" />}</span>
                            <span className="min-w-0 flex-1">
                                <Link href={`/admin/blog/${p.id}/edit`} className="block truncate font-bold hover:underline">{p.title.en}{p.is_featured && <Star className="ms-1.5 inline size-3.5 fill-saffron text-saffron" aria-label="Featured" />}</Link>
                                <span className="text-sm text-muted-ink">{[p.category, p.title.ar ? 'EN + AR' : 'EN only'].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', status(p) === 'Published' ? 'bg-forest-soft text-forest' : status(p) === 'Scheduled' ? 'bg-saffron-soft' : 'bg-[#F1F0EC] text-muted-ink')}>{status(p)}</span>
                            {status(p) === 'Published' && <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label="View"><ExternalLink className="size-4" /></a>}
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
