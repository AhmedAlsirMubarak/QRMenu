import { ContactSection } from '@/components/website/contact-section';
import type { ContactContent } from '@/components/website/contact-section';
import { pick, SiteShell } from '@/components/website/site-shell';
import type { Chrome, Lang } from '@/components/website/site-shell';

type Props = {
    page: { seo: Record<Lang, { title?: string; description?: string }>; sections: { type: string; enabled: boolean; content: Record<Lang, ContactContent> }[] };
    chrome: Chrome;
    topics: string[];
    topic: string;
    contactEmail: string | null;
};

/** Contact page — text edited in Admin › Website CMS › Contact; messages arrive in Admin › Messages. */
export default function Contact({ page, chrome, topics, topic, contactEmail }: Props) {
    const section = page.sections.find((s) => s.type === 'contact');

    return (
        <SiteShell chrome={chrome} seo={page.seo} active="contact">
            {(lang) => <ContactSection as="h1" c={pick(section?.content, lang)} lang={lang} topics={topics} initialTopic={topic} email={contactEmail} className="pt-10 md:pt-14" />}
        </SiteShell>
    );
}
