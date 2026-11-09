import { Head, router } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { BarChart, RankedBars } from '@/components/charts/bar-chart';
import { SelectInput } from '@/components/platform/fields';
import { PageHeader, StatCard } from '@/components/platform/side-nav';

type Props = {
    filters: { period: number; branch: number | null };
    branches: { id: number; name: string }[];
    fullAnalytics: boolean;
    kpis: { scans: number; views: number; visitors: number; item_views: number; review_clicks: number; searches: number };
    daily: { date: string; scans: number; views: number }[];
    topItems: { id: number; name: string; image_url: string | null; views: number }[];
    topCategories: { id: number; name: string; views: number }[];
    languages: { code: string; name: string; views: number; switches: number }[];
    sources: { key: string; label: string; views: number }[];
    hours: { hour: number; views: number }[];
    tables: { label: string; branch: string | null; scans: number }[];
    hasTables: boolean;
    branchComparison: { id: number; name: string; scans: number; views: number; rating: number | null; feedback: number }[];
};

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' });

export default function Analytics(props: Props) {
    const { filters, branches, fullAnalytics, kpis, daily, topItems, topCategories, languages, sources, hours, tables, hasTables, branchComparison } = props;
    const apply = (next: Partial<Props['filters']>) => router.get('/app/analytics', { ...filters, ...next }, { preserveState: true, preserveScroll: true, replace: true });
    const totalLang = Math.max(1, languages.reduce((s, l) => s + l.views, 0));
    const totalSource = Math.max(1, sources.reduce((s, l) => s + l.views, 0));

    return (
        <>
            <Head title="Analytics" />
            <PageHeader
                title="Analytics"
                description="How guests use your menu. Bots, link previews and your own staff aren’t counted."
                actions={
                    <>
                        {branches.length > 1 && (
                            <SelectInput aria-label="Branch" value={filters.branch ?? ''} onChange={(e) => apply({ branch: e.target.value ? Number(e.target.value) : null })}>
                                <option value="">All branches</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SelectInput>
                        )}
                        <div role="group" aria-label="Period" className="inline-flex rounded-xl bg-[#ECEAE4] p-1">
                            {[7, 30, 90].map((p) => (
                                <button key={p} type="button" onClick={() => apply({ period: p })} aria-pressed={filters.period === p} className={`h-9 rounded-lg px-3 text-sm font-bold ${filters.period === p ? 'bg-white shadow-sm' : 'text-muted-ink'}`}>
                                    {p} days
                                </button>
                            ))}
                        </div>
                    </>
                }
            />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                <StatCard tone="dark" label="QR SCANS" value={kpis.scans.toLocaleString()} />
                <StatCard label="MENU VIEWS" value={kpis.views.toLocaleString()} hint="Scans + link visits" />
                <StatCard label="UNIQUE VISITORS" value={kpis.visitors.toLocaleString()} hint="Estimated, per day" />
                <StatCard label="DISHES OPENED" value={kpis.item_views.toLocaleString()} hint={kpis.visitors ? `${(kpis.item_views / kpis.visitors).toFixed(1)} per visitor` : undefined} />
                <StatCard label="GOOGLE REVIEW TAPS" value={kpis.review_clicks.toLocaleString()} />
            </div>

            <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-3 font-bold">Scans and menu views per day</h2>
                <BarChart
                    title="QR scans and menu views per day"
                    data={daily}
                    xKey="date"
                    series={[{ key: 'scans', label: 'QR scans' }, { key: 'views', label: 'Menu views' }]}
                    formatX={shortDate}
                    labelEvery={filters.period > 30 ? 14 : filters.period > 7 ? 5 : 1}
                />
            </section>

            {!fullAnalytics ? (
                <div className="flex items-start gap-3 rounded-2xl bg-saffron-soft p-5">
                    <Lock className="mt-0.5 size-5 shrink-0" />
                    <div>
                        <div className="font-bold">Most-viewed dishes, languages, tables and branch comparison are on the Professional and Business plans.</div>
                        <div className="text-sm text-muted-ink">Upgrade to see what your guests look at most.</div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-4 font-bold">Most viewed dishes</h2>
                        <RankedBars rows={topItems.map((i) => ({ label: i.name, value: i.views, image: i.image_url }))} empty="No dish views yet." />
                    </section>
                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-4 font-bold">Most viewed categories</h2>
                        <RankedBars rows={topCategories.map((c) => ({ label: c.name, value: c.views }))} empty="No category views yet." />
                    </section>

                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-4 font-bold">Menu language</h2>
                        <RankedBars
                            rows={languages.map((l) => ({ label: l.name, value: l.views, hint: `${Math.round((l.views / totalLang) * 100)}%` }))}
                            empty="No views yet."
                        />
                        <h3 className="mb-3 mt-6 text-sm font-bold text-muted-ink">How guests arrive</h3>
                        <RankedBars rows={sources.map((s) => ({ label: s.label, value: s.views, hint: `${Math.round((s.views / totalSource) * 100)}%` }))} empty="No views yet." />
                    </section>

                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-3 font-bold">Busiest hours</h2>
                        <BarChart title="Menu views by hour of day" data={hours} xKey="hour" series={[{ key: 'views', label: 'Menu views' }]} height={160} formatX={(h) => `${h}:00`} labelEvery={4} />
                    </section>

                    <section className="rounded-2xl border border-line bg-white p-5">
                        <h2 className="mb-4 font-bold">Most scanned tables</h2>
                        <RankedBars rows={tables.map((t) => ({ label: t.label, value: t.scans, hint: branches.length > 1 ? (t.branch ?? undefined) : undefined }))} empty={hasTables ? 'No table scans in this period yet.' : 'Create table QR codes to see which tables scan most.'} />
                    </section>

                    {branchComparison.length > 1 && (
                        <section className="overflow-hidden rounded-2xl border border-line bg-white">
                            <h2 className="px-5 pb-3 pt-5 font-bold">Branch comparison</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[420px] text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-ink">
                                            <th className="px-5 py-2 font-bold">BRANCH</th>
                                            <th className="px-3 py-2 text-right font-bold">SCANS</th>
                                            <th className="px-3 py-2 text-right font-bold">VIEWS</th>
                                            <th className="px-5 py-2 text-right font-bold">RATING</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchComparison.map((b) => (
                                            <tr key={b.id} className="border-t border-[#F1F0EC]">
                                                <td className="px-5 py-2.5 font-semibold">{b.name}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">{b.scans.toLocaleString()}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">{b.views.toLocaleString()}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums">{b.rating ? `${b.rating} ★ (${b.feedback})` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </>
    );
}
