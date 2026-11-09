import { Head, Link, router } from '@inertiajs/react';
import { BarChart, RankedBars } from '@/components/charts/bar-chart';
import { PageHeader, StatCard } from '@/components/platform/side-nav';

type Ranked = { label: string; value: number; hint?: string; image?: string | null };
type Props = {
    period: number;
    kpis: {
        scans: number; scans_change: number | null; views: number; active_restaurants: number; total_restaurants: number; new_restaurants: number;
        new_users: number; feedback_count: number; feedback_avg: number; stories: number; story_shares: number;
    };
    daily: { date: string; scans: number; views: number }[];
    signups: { month: string; restaurants: number }[];
    topRestaurants: Ranked[];
    languages: Ranked[];
    sources: Ranked[];
    inactive: { id: number; name: string; slug: string; created_at: string }[];
    storage: { measured_at: string; total: number; stories: number; top: Ranked[] } | null;
};

const mb = (bytes: number) => (bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(2)} GB` : `${(bytes / 1048576).toFixed(1)} MB`);
const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' });
const withShare = (rows: Ranked[]) => {
    const total = rows.reduce((a, r) => a + r.value, 0) || 1;
    return rows.map((r) => ({ ...r, hint: `${Math.round((r.value / total) * 100)}%` }));
};

export default function GlobalAnalytics({ period, kpis, daily, signups, topRestaurants, languages, sources, inactive, storage }: Props) {
    return (
        <>
            <Head title="Global analytics" />
            <PageHeader
                title="Global analytics"
                description="Usage across every restaurant on the platform."
                actions={
                    <div role="group" aria-label="Period" className="inline-flex rounded-xl bg-[#ECEAE4] p-1">
                        {[7, 30, 90].map((p) => (
                            <button key={p} type="button" onClick={() => router.get('/admin/analytics', { period: p }, { preserveScroll: true, replace: true })} aria-pressed={period === p} className={`h-9 rounded-lg px-3 text-sm font-bold ${period === p ? 'bg-white shadow-sm' : 'text-muted-ink'}`}>
                                {p} days
                            </button>
                        ))}
                    </div>
                }
            />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                <StatCard tone="dark" label="QR SCANS" value={kpis.scans.toLocaleString()} hint={kpis.scans_change === null ? undefined : `${kpis.scans_change >= 0 ? '▲' : '▼'} ${Math.abs(kpis.scans_change)}% vs previous ${period} days`} />
                <StatCard label="MENU VIEWS" value={kpis.views.toLocaleString()} />
                <StatCard label="ACTIVE RESTAURANTS" value={`${kpis.active_restaurants} / ${kpis.total_restaurants}`} hint="Had guest views in this period" />
                <StatCard label="NEW RESTAURANTS" value={kpis.new_restaurants} hint={`${kpis.new_users} new user accounts`} />
                <StatCard label="GUEST RATING" value={kpis.feedback_count ? `${kpis.feedback_avg} ★` : '—'} hint={`${kpis.feedback_count} feedback`} />
                <StatCard label="PLATE STORIES" value={kpis.stories} hint={`${kpis.story_shares} shared`} />
            </div>

            <section className="mb-5 rounded-2xl border border-line bg-white p-5">
                <h2 className="mb-3 font-bold">Scans and menu views per day</h2>
                <BarChart title="Platform QR scans and menu views per day" data={daily} xKey="date" series={[{ key: 'scans', label: 'QR scans' }, { key: 'views', label: 'Menu views' }]} formatX={shortDate} labelEvery={period > 30 ? 14 : period > 7 ? 5 : 1} />
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-4 font-bold">Most viewed restaurants</h2>
                    <RankedBars rows={topRestaurants} empty="No menu views in this period." />
                </section>
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-3 font-bold">New restaurants per month</h2>
                    <BarChart title="New restaurants per month" data={signups} xKey="month" series={[{ key: 'restaurants', label: 'New restaurants' }]} height={180} labelEvery={2} />
                </section>
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-4 font-bold">Menu language</h2>
                    <RankedBars rows={withShare(languages)} empty="No views yet." />
                    <h3 className="mb-3 mt-6 text-sm font-bold text-muted-ink">How guests arrive</h3>
                    <RankedBars rows={withShare(sources)} empty="No views yet." />
                </section>
                <section className="rounded-2xl border border-line bg-white p-5">
                    <h2 className="mb-1 font-bold">No guest views in this period</h2>
                    <p className="mb-3 text-sm text-muted-ink">Active accounts that may need help getting their QR codes on the tables.</p>
                    {inactive.length === 0 ? <p className="text-sm text-muted-ink">Every active restaurant had guests.</p> : (
                        <ul className="divide-y divide-line text-sm">
                            {inactive.map((r) => (
                                <li key={r.id} className="flex items-center gap-2 py-2.5">
                                    <Link href={`/admin/restaurants?search=${encodeURIComponent(r.name)}`} className="font-bold hover:underline">{r.name}</Link>
                                    <span className="text-muted-ink">/{r.slug}</span>
                                    <span className="ms-auto text-muted-ink">joined {r.created_at}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="mt-5 rounded-2xl border border-line bg-white p-5">
                <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h2 className="font-bold">Storage used by uploads</h2>
                    {storage ? (
                        <span className="text-sm text-muted-ink">
                            {mb(storage.total)} in total · {mb(storage.stories)} Plate Story · measured {new Date(storage.measured_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                    ) : (
                        <span className="text-sm text-muted-ink">Measured every night — check back tomorrow (or run <code>php artisan plate-stories:cleanup</code>).</span>
                    )}
                </div>
                {storage && <RankedBars rows={storage.top} formatValue={mb} empty="No uploads yet." />}
            </section>
        </>
    );
}
