import { useForm } from '@inertiajs/react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Lang } from '@/components/website/site-shell';
import { cn } from '@/lib/utils';

export type ContactContent = {
    eyebrow?: string; title?: string; subtitle?: string; phone?: string; whatsapp?: string; address?: string; success_title?: string; success_text?: string;
};

const L = {
    en: {
        topic: 'What is it about?', name: 'Your name', email: 'Email', phone: 'Phone (optional)', company: 'Restaurant or business (optional)', message: 'Message',
        send: 'Send message', sending: 'Sending…', another: 'Send another message', placeholder: 'Tell us a little about your restaurant and what you need…',
        topics: { general: 'General question', sales: 'Plans & pricing', advertising: 'Advertising on Discover', support: 'Help with my account', partnership: 'Partnership' } as Record<string, string>,
        emailUs: 'Email', callUs: 'Phone', whatsapp: 'WhatsApp', visit: 'Office',
    },
    ar: {
        topic: 'موضوع الرسالة', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف (اختياري)', company: 'المطعم أو المنشأة (اختياري)', message: 'الرسالة',
        send: 'إرسال الرسالة', sending: 'جارٍ الإرسال…', another: 'إرسال رسالة أخرى', placeholder: 'أخبرنا قليلاً عن مطعمك وما تحتاجه…',
        topics: { general: 'سؤال عام', sales: 'الباقات والأسعار', advertising: 'الإعلان في صفحة اكتشف', support: 'مساعدة في حسابي', partnership: 'شراكة' } as Record<string, string>,
        emailUs: 'البريد', callUs: 'الهاتف', whatsapp: 'واتساب', visit: 'المكتب',
    },
};

/** Contact form + contact details. Used on the Contact page and as the last section of the Home page. */
export function ContactSection({ c, lang, topics, initialTopic = 'general', email, as: Heading = 'h2', className }: {
    c: ContactContent; lang: Lang; topics: string[]; initialTopic?: string; email: string | null; as?: 'h1' | 'h2'; className?: string;
}) {
    const t = L[lang];
    const [sent, setSent] = useState(false);
    const form = useForm({ topic: initialTopic, name: '', email: '', phone: '', company: '', message: '', locale: lang, website: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/contact', {
            preserveScroll: true,
            onSuccess: () => {
                setSent(true);
                form.reset('name', 'email', 'phone', 'company', 'message');
            },
        });
    };

    const details: { icon: ReactNode; label: string; value: string; href?: string }[] = [
        email ? { icon: <Mail className="size-5" />, label: t.emailUs, value: email, href: `mailto:${email}` } : null,
        c.phone ? { icon: <Phone className="size-5" />, label: t.callUs, value: c.phone, href: `tel:${c.phone.replace(/\s+/g, '')}` } : null,
        c.whatsapp ? { icon: <MessageCircle className="size-5" />, label: t.whatsapp, value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/\D+/g, '')}` } : null,
        c.address ? { icon: <MapPin className="size-5" />, label: t.visit, value: c.address } : null,
    ].filter(Boolean) as { icon: ReactNode; label: string; value: string; href?: string }[];

    const field = 'h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] outline-none transition-shadow focus:border-forest focus:ring-2 focus:ring-forest/20';
    const label = 'flex flex-col gap-1.5 text-[13px] font-bold';
    const error = (key: keyof typeof form.errors) => form.errors[key] && <span className="text-xs font-semibold text-clay">{form.errors[key]}</span>;

    return (
        <section id="contact" className={cn('scroll-mt-24 px-5 py-20 sm:px-6 lg:px-10 xl:px-16', className)}>
            <div className="grid gap-10 overflow-hidden rounded-[36px] bg-forest-deep p-6 text-white sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:p-14">
                <div className="flex flex-col">
                    {c.eyebrow && <span className="mb-3 w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-saffron">{c.eyebrow}</span>}
                    <Heading className="font-display text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{c.title}</Heading>
                    {c.subtitle && <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-mint/90">{c.subtitle}</p>}
                    {details.length > 0 && (
                        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-auto lg:grid-cols-1 lg:pt-10 xl:grid-cols-2">
                            {details.map((d) => {
                                const inner = (
                                    <>
                                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-saffron">{d.icon}</span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-bold uppercase tracking-wider text-mint/70">{d.label}</span>
                                            <span dir="auto" className="block break-words font-semibold">{d.value}</span>
                                        </span>
                                    </>
                                );
                                return (
                                    <li key={d.label}>
                                        {d.href ? (
                                            <a href={d.href} target={d.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/5">{inner}</a>
                                        ) : (
                                            <div className="flex items-center gap-3 p-2">{inner}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="rounded-[28px] bg-white p-5 text-ink sm:p-7">
                    {sent ? (
                        <div role="status" className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
                            <CheckCircle2 className="size-14 text-forest" />
                            <h3 className="font-display text-2xl font-extrabold">{c.success_title}</h3>
                            <p className="max-w-[340px] text-muted-ink">{c.success_text}</p>
                            <button type="button" onClick={() => setSent(false)} className="mt-3 h-11 rounded-full border border-line-strong px-5 text-sm font-bold hover:bg-sand">{t.another}</button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                            <fieldset>
                                <legend className="mb-2 text-[13px] font-bold">{t.topic}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {topics.map((k) => (
                                        <button key={k} type="button" onClick={() => form.setData('topic', k)} aria-pressed={form.data.topic === k} className={cn('h-10 rounded-full px-4 text-sm font-bold transition-colors', form.data.topic === k ? 'bg-ink text-white' : 'border border-line-strong hover:bg-sand')}>
                                            {t.topics[k] ?? k}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className={label}>{t.name}<input className={field} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoComplete="name" required />{error('name')}</label>
                                <label className={label}>{t.email}<input type="email" dir="ltr" className={field} value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} autoComplete="email" required />{error('email')}</label>
                                <label className={label}>{t.phone}<input type="tel" dir="ltr" className={field} value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} autoComplete="tel" />{error('phone')}</label>
                                <label className={label}>{t.company}<input className={field} value={form.data.company} onChange={(e) => form.setData('company', e.target.value)} autoComplete="organization" />{error('company')}</label>
                            </div>
                            <label className={label}>
                                {t.message}
                                <textarea rows={5} className={cn(field, 'h-auto resize-y py-3')} placeholder={t.placeholder} value={form.data.message} onChange={(e) => form.setData('message', e.target.value)} required />
                                {error('message')}
                            </label>
                            {/* Honeypot: invisible to people, bots fill it in. */}
                            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />
                            <button type="submit" disabled={form.processing} className="inline-flex h-13 min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 font-bold text-white transition-colors hover:bg-forest disabled:opacity-60">
                                <Send className="size-4 rtl:-scale-x-100" /> {form.processing ? t.sending : t.send}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
