import { Head, Link, router } from '@inertiajs/react';
import { KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, TextInput } from '@/components/platform/fields';
import { Pager } from '@/components/platform/pager';
import { PageHeader } from '@/components/platform/side-nav';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

type Row = {
    id: number; name: string; email: string; is_super_admin: boolean; verified: boolean; two_factor: boolean; created_at: string | null;
    restaurants: { id: number; name: string; role: string }[];
};
type Props = { users: Paginated<Row>; filters: { search?: string; type?: string }; counts: { all: number; admins: number; no_restaurant: number } };

export default function UsersIndex({ users, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const apply = (next: Record<string, string>) => router.get('/admin/users', { ...filters, search, ...next }, { preserveState: true, replace: true });
    const tabs = [
        { key: '', label: `All (${counts.all})` },
        { key: 'admins', label: `Super admins (${counts.admins})` },
        { key: 'no-restaurant', label: `No restaurant (${counts.no_restaurant})` },
        { key: 'unverified', label: 'Unverified' },
    ];

    const toggleAdmin = (u: Row) => {
        const msg = u.is_super_admin ? `Remove super admin access from ${u.name}?` : `Give ${u.name} full super admin access to the whole platform?`;
        if (window.confirm(msg)) router.patch(`/admin/users/${u.id}`, { is_super_admin: !u.is_super_admin }, { preserveScroll: true });
    };
    const remove = (u: Row) => {
        if (window.confirm(`Delete ${u.email}? This can’t be undone.`)) router.delete(`/admin/users/${u.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Users" />
            <PageHeader title="Users" description="Everyone who can sign in: restaurant teams and super admins." />

            <div role="tablist" aria-label="Filter users" className="mb-3 flex flex-wrap gap-1.5">
                {tabs.map((t) => (
                    <button key={t.key} type="button" role="tab" aria-selected={(filters.type ?? '') === t.key} onClick={() => apply({ type: t.key })} className={cn('h-10 rounded-full px-4 text-sm font-bold', (filters.type ?? '') === t.key ? 'bg-ink text-white' : 'border border-line-strong bg-white')}>
                        {t.label}
                    </button>
                ))}
            </div>
            <form role="search" onSubmit={(e: FormEvent) => { e.preventDefault(); apply({}); }} className="mb-4 flex gap-2">
                <TextInput type="search" aria-label="Search users" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-sm" />
                <Btn type="submit">Search</Btn>
            </form>

            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-paper text-xs font-bold text-muted-ink">
                        <tr><th className="px-4 py-2.5 text-start">User</th><th className="px-4 py-2.5 text-start">Restaurants</th><th className="px-4 py-2.5 text-start">Status</th><th className="px-4 py-2.5 text-start">Joined</th><th className="px-4 py-2.5 text-end">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {users.data.map((u) => (
                            <tr key={u.id}>
                                <td className="px-4 py-3">
                                    <div className="font-bold">{u.name}</div>
                                    <div className="text-muted-ink">{u.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {u.restaurants.length === 0 ? <span className="text-muted-ink">—</span> : (
                                        <ul className="flex flex-col gap-0.5">
                                            {u.restaurants.map((r) => (
                                                <li key={r.id}><Link href={`/admin/restaurants?search=${encodeURIComponent(r.name)}`} className="font-semibold hover:underline">{r.name}</Link> <span className="text-xs capitalize text-muted-ink">{r.role}</span></li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {u.is_super_admin && <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold text-white">Super admin</span>}
                                        {u.verified ? <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-forest">Verified</span> : (
                                            <button type="button" onClick={() => router.patch(`/admin/users/${u.id}`, { verify: true }, { preserveScroll: true })} className="rounded-full bg-saffron-soft px-2 py-0.5 text-[11px] font-bold" title="Mark email as verified">Unverified · verify</button>
                                        )}
                                        {u.two_factor && <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold">2FA</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-muted-ink">{u.created_at}</td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        <button type="button" onClick={() => router.post(`/admin/users/${u.id}/reset`, {}, { preserveScroll: true })} className="grid size-9 place-items-center rounded-lg hover:bg-paper" aria-label={`Send password reset to ${u.email}`} title="Send password reset link"><KeyRound className="size-4" /></button>
                                        <button type="button" onClick={() => toggleAdmin(u)} className={cn('grid size-9 place-items-center rounded-lg hover:bg-paper', u.is_super_admin && 'text-forest')} aria-label={u.is_super_admin ? `Remove super admin from ${u.name}` : `Make ${u.name} super admin`} title={u.is_super_admin ? 'Remove super admin' : 'Make super admin'}><ShieldCheck className="size-4" /></button>
                                        <button type="button" onClick={() => remove(u)} className="grid size-9 place-items-center rounded-lg text-clay hover:bg-clay-soft" aria-label={`Delete ${u.email}`} title="Delete account"><Trash2 className="size-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-ink">No users match.</td></tr>}
                    </tbody>
                </table>
            </div>
            <Pager page={users} />
        </>
    );
}
