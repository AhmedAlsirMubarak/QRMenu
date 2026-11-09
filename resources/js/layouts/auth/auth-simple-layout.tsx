import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Camera, Star } from 'lucide-react';
import { BrandMark } from '@/components/platform/brand-mark';
import { GoogleMark } from '@/components/website/google-mark';
import { DEMO_PHOTOS, hideOnError } from '@/lib/demo-photos';
import type { AuthLayoutProps } from '@/types';

/**
 * Branded split layout for every auth screen (log in, sign up, password reset, 2FA, verify email).
 * Left: brand story (desktop only). Right: the form, styled through the .brand-ui theme scope.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const { brand } = usePage().props;

    return (
        <div className="brand-ui grid min-h-svh bg-paper text-ink lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <aside className="relative hidden overflow-hidden bg-forest-deep text-white lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden>
                <span className="pointer-events-none absolute -end-40 -top-40 size-[460px] rounded-full bg-forest opacity-70" />
                <span className="pointer-events-none absolute -bottom-32 -start-24 size-[340px] rounded-full bg-saffron/15" />

                <Link href="/" className="relative w-fit"><BrandMark light /></Link>

                <div className="relative">
                    <h2 className="max-w-[460px] font-display text-[clamp(34px,3.4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                        Your menu, one scan away. <span className="text-saffron">Your reviews, too.</span>
                    </h2>
                    <p className="mt-4 max-w-[420px] text-[17px] leading-relaxed text-mint/90">
                        Bilingual QR menus, honest guest feedback and Plate Story — all from one dashboard.
                    </p>

                    <div className="relative mt-10 h-[250px] max-w-[460px]">
                        <div className="absolute start-0 top-0 w-[320px] rounded-3xl bg-white p-4 text-ink shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
                            <div className="flex items-center gap-3">
                                <span className="grid size-11 place-items-center rounded-xl bg-saffron font-display font-extrabold">BS</span>
                                <span>
                                    <b className="block font-display text-lg leading-tight">Bait Al Saffron</b>
                                    <span className="text-xs text-muted-ink">Muscat · Al Mouj</span>
                                </span>
                            </div>
                            <div className="mt-3 flex gap-1.5 text-xs font-bold">
                                <span className="rounded-full bg-ink px-3 py-1.5 text-white">Breakfast</span>
                                <span className="rounded-full bg-sand px-3 py-1.5">Grills</span>
                                <span className="rounded-full bg-sand px-3 py-1.5">Drinks</span>
                            </div>
                            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line p-2">
                                <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_40%_40%,#F7C873,#C9541F)]"><img src={DEMO_PHOTOS.shakshuka} alt="" onError={hideOnError} className="size-full object-cover" /></span>
                                <span className="min-w-0 flex-1"><b className="block text-sm">Shakshuka</b><span className="block truncate text-xs text-muted-ink">Eggs, tomato, cumin</span></span>
                                <b className="text-sm">2.400 OMR</b>
                            </div>
                        </div>
                        <div className="absolute end-0 top-6 flex items-center gap-2 rounded-2xl bg-saffron px-3.5 py-2.5 text-sm font-bold text-ink shadow-lg">
                            <Star className="size-4 fill-ink" /> 4.8 guest rating
                        </div>
                        <div className="absolute -bottom-6 end-0 w-[250px] rounded-2xl bg-white p-3 text-ink shadow-lg">
                            <div className="flex items-center gap-2.5">
                                <GoogleMark className="size-8" />
                                <span className="min-w-0 flex-1">
                                    <b className="block text-sm leading-tight">New Google review</b>
                                    <span className="flex items-center gap-0.5">
                                        {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-3 fill-saffron text-saffron" />)}
                                        <span className="ms-1 text-[11px] font-bold text-muted-ink">5.0</span>
                                    </span>
                                </span>
                                <span className="self-start text-[10px] text-muted-ink">now</span>
                            </div>
                            <p className="mt-2 rounded-lg bg-sand px-2.5 py-1.5 text-xs leading-snug text-ink/85">“Best shakshuka in Muscat — and the QR menu is so easy!”</p>
                        </div>
                        <div className="absolute -start-4 top-[150px] grid size-11 place-items-center rounded-full bg-ink text-saffron shadow-lg">
                            <Camera className="size-5" />
                        </div>
                    </div>
                </div>

                <p className="relative text-sm text-mint/70">© {new Date().getFullYear()} {brand.name}</p>
            </aside>

            <main className="flex min-h-svh flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Link href="/" className="lg:invisible"><BrandMark /></Link>
                    <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-ink transition-colors hover:bg-white hover:text-ink">
                        <ArrowLeft className="size-4" /> Back to website
                    </Link>
                </div>

                <div className="flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-[420px]">
                        <header className="mb-8">
                            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em]">{title}</h1>
                            {description && <p className="mt-2 text-[15px] leading-relaxed text-muted-ink">{description}</p>}
                        </header>
                        {children}
                    </div>
                </div>

                <nav aria-label="Legal" className="flex justify-center gap-5 text-xs text-muted-ink">
                    <Link href="/terms" className="hover:text-ink">Terms of Service</Link>
                    <Link href="/marketplace" className="hover:text-ink">Discover restaurants</Link>
                </nav>
            </main>
        </div>
    );
}
