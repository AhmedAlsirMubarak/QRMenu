import { Head, router, useForm } from '@inertiajs/react';
import { Lock, Trash2, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Btn, Field, SelectInput, TextInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';

type Member = { id: number; name: string; email: string; role: string; joined_at: string | null; is_me: boolean; invited: boolean };
type Props = { members: Member[]; roles: { value: string; label: string }[]; teamLimit: number | null };

const ROLE_HELP: Record<string, string> = {
    owner: 'Everything, including billing, branches and staff.',
    manager: 'Menu, QR codes, feedback, Plate Story and analytics.',
    editor: 'Categories and dishes only.',
};

export default function Staff({ members, roles, teamLimit }: Props) {
    const form = useForm({ name: '', email: '', role: 'manager' });
    const full = teamLimit !== null && members.length >= teamLimit;

    const invite = (e: FormEvent) => {
        e.preventDefault();
        form.clearErrors();
        form.post('/app/staff', { preserveScroll: true, onSuccess: () => form.reset() });
    };

    const changeRole = (m: Member, role: string) => router.put(`/app/staff/${m.id}`, { role }, { preserveScroll: true });

    const remove = (m: Member) => {
        if (window.confirm(`Remove ${m.name}? They will lose access straight away.`)) {
            router.delete(`/app/staff/${m.id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Staff" />
            <PageHeader
                title="Staff"
                description={teamLimit === null ? 'Invite your team and choose what each person can change.' : `${members.length} of ${teamLimit} team members on your plan.`}
            />

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                <section aria-label="Team members" className="overflow-hidden rounded-2xl border border-line bg-white">
                    <ul className="divide-y divide-line">
                        {members.map((m) => (
                            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-sm font-extrabold">
                                    {m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold">
                                        {m.name} {m.is_me && <span className="text-xs font-semibold text-muted-ink">(you)</span>}
                                        {m.invited && <span className="ml-1 rounded-md bg-saffron-soft px-1.5 py-0.5 text-[11px] font-bold" title="Hasn’t set a password yet">Invited</span>}
                                    </span>
                                    <span className="block truncate text-sm text-muted-ink">{m.email}</span>
                                </span>
                                <label className="sr-only" htmlFor={`role-${m.id}`}>Role for {m.name}</label>
                                <SelectInput id={`role-${m.id}`} value={m.role} onChange={(e) => changeRole(m, e.target.value)} disabled={m.is_me} className="w-32">
                                    {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </SelectInput>
                                <button type="button" onClick={() => remove(m)} disabled={m.is_me} className="grid size-10 place-items-center rounded-lg text-clay hover:bg-clay-soft disabled:opacity-25" aria-label={`Remove ${m.name}`}>
                                    <Trash2 className="size-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <aside className="flex flex-col gap-4">
                    <form onSubmit={invite} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                        <h2 className="font-extrabold">Invite someone</h2>
                        {full ? (
                            <p className="flex items-start gap-2 rounded-xl bg-sand p-3 text-sm">
                                <Lock className="mt-0.5 size-4 shrink-0" /> Your plan includes {teamLimit} team members. <a href="/app/billing" className="font-bold underline">Upgrade</a> for unlimited staff.
                            </p>
                        ) : (
                            <>
                                <Field label="Name" error={form.errors.name}>
                                    <TextInput value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} autoComplete="off" required />
                                </Field>
                                <Field label="Email" error={form.errors.email}>
                                    <TextInput type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} autoComplete="off" required />
                                </Field>
                                <Field label="Role" error={form.errors.role}>
                                    <SelectInput value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                                        {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </SelectInput>
                                </Field>
                                <Btn type="submit" variant="forest" disabled={form.processing}><UserPlus className="size-4" /> Send invitation</Btn>
                                <p className="text-xs text-muted-ink">They get an email to set a password. People who already have an account just sign in.</p>
                            </>
                        )}
                    </form>

                    <dl className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 text-sm">
                        <h2 className="font-extrabold">What each role can do</h2>
                        {roles.map((r) => (
                            <div key={r.value}>
                                <dt className="font-bold">{r.label}</dt>
                                <dd className="text-muted-ink">{ROLE_HELP[r.value]}</dd>
                            </div>
                        ))}
                    </dl>
                </aside>
            </div>
        </>
    );
}
