import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, SplitText);

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function useSmoothScroll(): void {
    useEffect(() => {
        if (prefersReducedMotion()) return;

        const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        // In-page anchor links (#pricing) scroll smoothly too.
        const onClick = (e: MouseEvent) => {
            const link = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
            if (!link) return;
            const target = document.querySelector(link.getAttribute('href') ?? '');
            if (target) {
                e.preventDefault();
                lenis.scrollTo(target as HTMLElement, { offset: -80 });
            }
        };
        document.addEventListener('click', onClick);

        return () => {
            document.removeEventListener('click', onClick);
            gsap.ticker.remove(tick);
            lenis.destroy();
        };
    }, []);
}

/** Fades/slides children in when they scroll into view. `stagger` animates direct children one by one. */
export function Reveal({ as: Tag = 'div', children, className, stagger = 0, y = 28, delay = 0 }: { as?: ElementType; children: ReactNode; className?: string; stagger?: number; y?: number; delay?: number }) {
    const ref = useRef<HTMLElement>(null);

    useIsoLayoutEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        const targets = stagger ? Array.from(el.children) : [el];
        const ctx = gsap.context(() => {
            gsap.from(targets, {
                y,
                opacity: 0,
                duration: 0.9,
                ease: 'power3.out',
                delay,
                stagger,
                clearProps: 'transform,opacity', // never leave a card shifted if the animation is interrupted
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            });
        }, el);
        return () => ctx.revert();
    }, [stagger, y, delay]);

    return (
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    );
}

/**
 * Headline that reveals word by word (React-Bits-style split text, built on GSAP SplitText).
 * Arabic is split by words only so letters stay joined.
 */
export function SplitHeading({ as: Tag = 'h2', children, className, rtl = false, onScroll = true }: { as?: ElementType; children: ReactNode; className?: string; rtl?: boolean; onScroll?: boolean }) {
    const ref = useRef<HTMLElement>(null);

    useIsoLayoutEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        let split: SplitText | null = null;
        const ctx = gsap.context(() => {
            // No mask: masks clip descenders (y, g, commas) on tight display line-heights.
            split = SplitText.create(el, { type: 'words' });
            gsap.from(split.words, {
                y: 28,
                opacity: 0,
                filter: 'blur(6px)',
                duration: 0.8,
                ease: 'power3.out',
                stagger: 0.05,
                ...(onScroll ? { scrollTrigger: { trigger: el, start: 'top 88%', once: true } } : { delay: 0.1 }),
            });
        }, el);
        return () => {
            ctx.revert();
            split?.revert();
        };
    }, [children, rtl, onScroll]);

    return (
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    );
}

/** Endless ticker strip (pauses on hover; static for reduced motion). */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
    const row = (hidden: boolean) => (
        <ul className="flex shrink-0 items-center gap-12 pe-12" aria-hidden={hidden || undefined}>
            {items.map((item, i) => (
                <li key={i} className="flex items-center gap-12 whitespace-nowrap">
                    {item}
                    <span className="size-1.5 rounded-full bg-saffron" aria-hidden />
                </li>
            ))}
        </ul>
    );

    return (
        <div className={cn('group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]', className)}>
            <div className="flex animate-[qm-marquee_32s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none rtl:[animation-direction:reverse]">
                {row(false)}
                {row(true)}
            </div>
        </div>
    );
}

/** Subtle parallax drift for decorative elements. */
export function useParallax<T extends HTMLElement>(amount = 60) {
    const ref = useRef<T>(null);
    useIsoLayoutEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        const ctx = gsap.context(() => {
            gsap.to(el, { y: -amount, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        }, el);
        return () => ctx.revert();
    }, [amount]);
    return ref;
}
