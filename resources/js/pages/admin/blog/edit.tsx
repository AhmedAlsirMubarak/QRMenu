import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { ImagePicker } from '@/components/menu/image-picker';
import { Btn, CheckRow, Field, TextInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import type { Translations } from '@/types';

type Post = { id: number; slug: string; title: Translations; excerpt: Translations | null; body: Translations | null; category: string | null; is_featured: boolean; published_at: string | null; cover_url: string | null };

export default function BlogEdit({ post, categories }: { post: Post | null; categories: string[] }) {
    const form = useForm({
        title: { en: post?.title.en ?? '', ar: post?.title.ar ?? '' },
        excerpt: { en: post?.excerpt?.en ?? '', ar: post?.excerpt?.ar ?? '' },
        body: { en: post?.body?.en ?? '', ar: post?.body?.ar ?? '' },
        slug: post?.slug ?? '',
        category: post?.category ?? '',
        is_featured: post?.is_featured ?? false,
        published_at: post?.published_at ?? '',
        cover: null as File | null,
        remove_cover: false,
    });
    const { data, setData } = form;
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (e: FormEvent, publishNow = false) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            published_at: publishNow ? new Date().toISOString().slice(0, 16) : d.published_at || null,
            ...(post ? { _method: 'put' } : {}),
        }));
        form.post(post ? `/admin/blog/${post.id}` : '/admin/blog', { preserveScroll: true, forceFormData: true });
    };

    const remove = () => {
        if (post && window.confirm('Delete this post?')) router.delete(`/admin/blog/${post.id}`);
    };

    return (
        <>
            <Head title={post ? 'Edit post' : 'New post'} />
            <Link href="/admin/blog" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-muted-ink hover:text-ink"><ArrowLeft className="size-4" />Blog posts</Link>
            <PageHeader title={post ? 'Edit post' : 'New post'} actions={post && <Btn variant="danger" onClick={remove}><Trash2 className="size-4" />Delete</Btn>} />

            <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_320px]">
                <div className="grid gap-5 lg:grid-cols-2">
                    {(['en', 'ar'] as const).map((lang) => (
                        <section key={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
                            <h2 className="text-xs font-bold text-muted-ink">{lang === 'en' ? 'ENGLISH (required)' : 'العربية (اختياري)'}</h2>
                            <Field label={lang === 'en' ? 'Title' : 'العنوان'} error={errors[`title.${lang}`]}>
                                <TextInput value={data.title[lang]} onChange={(e) => setData('title', { ...data.title, [lang]: e.target.value })} required={lang === 'en'} />
                            </Field>
                            <Field label={lang === 'en' ? 'Short summary' : 'ملخص قصير'}>
                                <textarea rows={2} value={data.excerpt[lang]} onChange={(e) => setData('excerpt', { ...data.excerpt, [lang]: e.target.value })} className="rounded-[10px] border border-line-strong px-3 py-2 text-sm font-medium" />
                            </Field>
                            <Field label={lang === 'en' ? 'Article' : 'المقال'} error={errors[`body.${lang}`]}>
                                <textarea rows={18} value={data.body[lang]} onChange={(e) => setData('body', { ...data.body, [lang]: e.target.value })} className="rounded-[10px] border border-line-strong px-3 py-2 font-mono text-[13px] font-normal leading-relaxed" />
                                <span className="text-xs font-medium text-muted-ink">{lang === 'en' ? 'Blank line = new paragraph. ## Heading, - list item, **bold**, *italic*, [link](https://…), > quote' : 'سطر فارغ = فقرة جديدة. ## عنوان، - عنصر قائمة، **عريض**'}</span>
                            </Field>
                        </section>
                    ))}
                </div>

                <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                    <ImagePicker label="Cover image" aspect="aspect-[16/10]" currentUrl={post?.cover_url ?? null} file={data.cover} removed={data.remove_cover} onFile={(f) => setData((d) => ({ ...d, cover: f, remove_cover: false }))} onRemove={() => setData('remove_cover', true)} error={errors.cover} />
                    <Field label="Link" error={errors.slug}>
                        <div className="flex items-center rounded-[10px] border border-line-strong bg-paper ps-3 text-sm text-muted-ink">/blog/<TextInput className="min-w-0 flex-1 rounded-s-none border-0" value={data.slug} placeholder="from the title" onChange={(e) => setData('slug', e.target.value.toLowerCase())} /></div>
                    </Field>
                    <Field label="Category" error={errors.category}>
                        <TextInput list="blog-categories" value={data.category} onChange={(e) => setData('category', e.target.value)} placeholder="Guides" />
                        <datalist id="blog-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                    </Field>
                    <CheckRow checked={data.is_featured} onChange={(v) => setData('is_featured', v)}>Featured at the top of the blog</CheckRow>
                    <Field label="Publish date (empty = draft)" error={errors.published_at}>
                        <TextInput type="datetime-local" value={data.published_at} onChange={(e) => setData('published_at', e.target.value)} />
                    </Field>
                    <Btn type="submit" variant="dark" disabled={form.processing}>Save</Btn>
                    {!data.published_at && <Btn variant="forest" disabled={form.processing} onClick={(e) => submit(e as unknown as FormEvent, true)}>Publish now</Btn>}
                </aside>
            </form>
        </>
    );
}
