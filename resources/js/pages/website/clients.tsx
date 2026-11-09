import { Store } from 'lucide-react';
import { Reveal, SplitHeading } from '@/components/website/motion';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';
import { ClientTile } from '@/pages/website/home';
import type { ClientCard } from '@/pages/website/home';

type Props = {
    page: { seo: Record<Lang, { title: string; description: string }>; sections: { type: string; enabled: boolean; content: Record<Lang, any> }[] };
    chrome: Chrome;
    clients: ClientCard[];
};

export default function Clients({ page, chrome, clients }: Props) {
    const intro = page.sections.find((s) => s.type === 'intro');

    return (
        <SiteShell chrome={chrome} seo={page.seo} active="clients">
            {(lang) => {
                const c = pick(intro?.content, lang) as { title: string; subtitle: string; empty: string };
                return (
                    <>
                        <section className="px-5 pb-10 pt-14 sm:px-6 lg:px-10 xl:px-16 md:pt-20">
                            <SplitHeading as="h1" onScroll={false} rtl={lang === 'ar'} className="mb-4 font-display text-[clamp(44px,7vw,68px)] font-extrabold leading-none tracking-[-0.035em]">{c.title}</SplitHeading>
                            <Reveal delay={0.2}><p className="max-w-[580px] text-lg text-muted-ink">{c.subtitle}</p></Reveal>
                        </section>
                        <section className="px-5 pb-24 sm:px-6 lg:px-10 xl:px-16">
                            {clients.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-white px-6 py-20 text-center text-muted-ink">
                                    <Store className="size-9" />{c.empty}
                                </div>
                            ) : (
                                <Reveal stagger={0.07} className="grid auto-rows-fr items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                    {clients.map((client) => <ClientTile key={client.slug} client={client} lang={lang} />)}
                                </Reveal>
                            )}
                        </section>
                    </>
                );
            }}
        </SiteShell>
    );
}
