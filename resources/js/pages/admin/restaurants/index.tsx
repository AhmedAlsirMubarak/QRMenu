import { Head, Link, router, useForm } from '@inertiajs/react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/platform/side-nav';
import { tr } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Paginated, Subscription } from '@/types';

const decode = (label: string) =>
    label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»');

type Row = {
    id: number;
    name: string;
    slug: string;
    status: 'active' | 'suspended';
    currency: string;
    branches_count: number;
    items_count: number;
    created_at: string;
    subscription: Subscription | null;
    users: { id: number; name: string; email: string }[];
    is_showcased: boolean;
    deleted_at: string | null;
};

export default function RestaurantsIndex({
    restaurants,
    filters,
    deletedCount,
}: {
    restaurants: Paginated<Row>;
    filters: { search?: string; status?: string };
    deletedCount: number;
}) {
    const [deleting, setDeleting] = useState<{ row: Row; forever: boolean } | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (next: Record<string, string>) =>
        router.get(
            '/admin/restaurants',
            { ...filters, search, ...next },
            { preserveState: true, replace: true },
        );

    const toggleStatus = (r: Row) => {
        const status = r.status === 'active' ? 'suspended' : 'active';
        if (
            status === 'suspended' &&
            !window.confirm(
                `Suspend ${r.name}? Their menu and dashboard will stop working.`,
            )
        )
            return;
        router.patch(
            `/admin/restaurants/${r.id}`,
            { status },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Restaurants" />
            <PageHeader
                title="Restaurants"
                description={`${restaurants.total} client accounts`}
            />

            <form
                onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    apply({});
                }}
                className="mb-4 flex flex-wrap gap-2"
                role="search"
            >
                <TextInput
                    type="search"
                    aria-label="Search restaurants"
                    placeholder="Name or link"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                />
                <SelectInput
                    aria-label="Status"
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value })}
                >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted ({deletedCount})</option>
                </SelectInput>
                <Btn type="submit" variant="outline" className="h-[42px]">
                    Search
                </Btn>
            </form>

            <section className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead>
                            <tr className="text-left text-xs text-muted-ink">
                                <th className="px-5 py-3 font-bold">
                                    RESTAURANT
                                </th>
                                <th className="px-3 py-3 font-bold">OWNER</th>
                                <th className="px-3 py-3 font-bold">PLAN</th>
                                <th className="px-3 py-3 font-bold">
                                    BRANCHES
                                </th>
                                <th className="px-3 py-3 font-bold">ITEMS</th>
                                <th className="px-3 py-3 font-bold">STATUS</th>
                                <th className="px-3 py-3 font-bold">ON WEBSITE</th>
                                <th className="px-5 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {restaurants.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-5 py-10 text-center text-muted-ink"
                                    >
                                        No restaurants match.
                                    </td>
                                </tr>
                            )}
                            {restaurants.data.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-t border-[#F1F0EC]"
                                >
                                    <td className="px-5 py-3">
                                        <div className="font-bold">
                                            {r.name}
                                        </div>
                                        <div className="text-xs text-muted-ink">
                                            /{r.slug} · {r.currency}
                                        </div>
                                        {r.deleted_at && <div className="text-xs font-semibold text-clay">Deleted {new Date(r.deleted_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                                    </td>
                                    <td className="px-3 py-3">
                                        {r.users[0] ? (
                                            <>
                                                <div>{r.users[0].name}</div>
                                                <div className="text-xs text-muted-ink">
                                                    {r.users[0].email}
                                                </div>
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        {tr(r.subscription?.plan?.name) || '—'}
                                        <div className="text-xs text-muted-ink capitalize">
                                            {r.subscription?.status.replace(
                                                '_',
                                                ' ',
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        {r.branches_count}
                                    </td>
                                    <td className="px-3 py-3">
                                        {r.items_count}
                                    </td>
                                    <td className="px-3 py-3">
                                        <span
                                            className={cn(
                                                'rounded-full px-2.5 py-1 text-xs font-bold',
                                                r.status === 'active'
                                                    ? 'bg-forest-soft text-forest'
                                                    : 'bg-clay-soft text-clay',
                                            )}
                                        >
                                            {r.status === 'active'
                                                ? 'Active'
                                                : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <label className="inline-flex items-center gap-2 text-sm font-semibold">
                                            <input
                                                type="checkbox"
                                                checked={r.is_showcased}
                                                onChange={(e) =>
                                                    router.patch(
                                                        `/admin/restaurants/${r.id}`,
                                                        { is_showcased: e.target.checked },
                                                        { preserveScroll: true },
                                                    )
                                                }
                                                className="size-[18px] accent-forest"
                                                aria-label={`Show ${r.name} on the website`}
                                            />
                                            {r.is_showcased ? 'Shown' : 'No'}
                                        </label>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {r.deleted_at ? (
                                            <span className="inline-flex items-center gap-3">
                                                <button type="button" onClick={() => router.patch(`/admin/restaurants/${r.id}/restore`, {}, { preserveScroll: true })} className="inline-flex items-center gap-1 text-sm font-bold text-forest hover:underline">
                                                    <RotateCcw className="size-4" /> Restore
                                                </button>
                                                <button type="button" onClick={() => setDeleting({ row: r, forever: true })} className="text-sm font-bold text-clay hover:underline">
                                                    Delete forever
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2">
                                                <button type="button" onClick={() => toggleStatus(r)} className="text-sm font-bold text-forest hover:underline">
                                                    {r.status === 'active' ? 'Suspend' : 'Activate'}
                                                </button>
                                                <button type="button" onClick={() => setDeleting({ row: r, forever: false })} className="grid size-9 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label={`Delete ${r.name}`} title="Delete restaurant">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {restaurants.last_page > 1 && (
                <nav
                    aria-label="Pagination"
                    className="mt-4 flex flex-wrap gap-1"
                >
                    {restaurants.links.map((l, i) =>
                        l.url ? (
                            <Link
                                key={i}
                                href={l.url}
                                preserveScroll
                                className={cn(
                                    'rounded-lg px-3 py-2 text-sm font-semibold',
                                    l.active ? 'bg-ink text-white' : 'bg-white',
                                )}
                            >
                                {decode(l.label)}
                            </Link>
                        ) : (
                            <span
                                key={i}
                                className="px-3 py-2 text-sm text-muted-ink"
                            >
                                {decode(l.label)}
                            </span>
                        ),
                    )}
                </nav>
            )}
            <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="bg-white sm:max-w-md">
                    {deleting && <DeleteRestaurant row={deleting.row} forever={deleting.forever} onDone={() => setDeleting(null)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

function DeleteRestaurant({ row, forever, onDone }: { row: Row; forever: boolean; onDone: () => void }) {
    const form = useForm({ confirm_name: '' });
    const matches = form.data.confirm_name.trim() === row.name;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.delete(forever ? `/admin/restaurants/${row.id}/force` : `/admin/restaurants/${row.id}`, { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">{forever ? 'Delete forever?' : `Delete ${row.name}?`}</DialogTitle>
                <DialogDescription asChild>
                    {forever ? (
                        <div className="text-sm text-muted-ink">
                            This permanently erases <b className="text-ink">{row.name}</b>: menu, photos, branches, QR codes, feedback, Plate Stories and statistics. Invoices stay in Finance. <b className="text-clay">This can’t be undone.</b>
                        </div>
                    ) : (
                        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-ink">
                            <li>The guest menu and every printed QR code stop working immediately.</li>
                            <li>The team loses access to the dashboard; their user accounts are kept.</li>
                            <li>It’s removed from the website and Marketplace, and its ads are paused.</li>
                            <li>Nothing is erased yet — you can restore it from <b className="text-ink">All statuses › Deleted</b>.</li>
                        </ul>
                    )}
                </DialogDescription>
            </DialogHeader>
            <Field label={<span>Type <span className="select-all rounded bg-sand px-1.5 py-0.5">{row.name}</span> to confirm</span>} error={form.errors.confirm_name}>
                <TextInput value={form.data.confirm_name} onChange={(e) => form.setData('confirm_name', e.target.value)} autoComplete="off" autoFocus />
            </Field>
            <div className="flex gap-2">
                <Btn variant="outline" onClick={onDone}>Cancel</Btn>
                <Btn type="submit" variant="danger" className="flex-1" disabled={!matches || form.processing}>
                    <Trash2 className="size-4" /> {forever ? 'Delete forever' : 'Delete restaurant'}
                </Btn>
            </div>
        </form>
    );
}
