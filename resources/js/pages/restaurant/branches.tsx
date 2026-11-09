import { Head, router, useForm } from '@inertiajs/react';
import { MapPin, Pencil, Plus, Trash2, Wifi } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Btn, CheckRow, Field, TextInput } from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { plural } from '@/lib/i18n';
import type { PlanLimitsInfo } from '@/types';

type Branch = {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    area: string | null;
    address: string | null;
    phone: string | null;
    wifi_name: string | null;
    wifi_password: string | null;
    latitude: string | null;
    longitude: string | null;
    google_review_url: string | null;
    is_active: boolean;
    qr_codes_count: number;
};

export default function Branches({
    branches,
    limits,
    canAdd,
}: {
    branches: Branch[];
    limits: PlanLimitsInfo;
    canAdd: boolean;
}) {
    const [editing, setEditing] = useState<Branch | 'new' | null>(null);

    const remove = (b: Branch) => {
        if (
            !window.confirm(`Remove ${b.name}? Its QR codes will stop working.`)
        )
            return;
        router.delete(`/app/branches/${b.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Branches" />
            <PageHeader
                title="Branches"
                description={
                    limits.max_branches === null
                        ? 'Unlimited branches on your plan'
                        : `${branches.length} of ${plural(limits.max_branches, 'branch', 'branches')} on your ${limits.plan ?? ''} plan`
                }
                actions={
                    <Btn
                        onClick={() => setEditing('new')}
                        disabled={!canAdd}
                        title={
                            canAdd ? undefined : 'Upgrade to add more branches'
                        }
                    >
                        <Plus className="size-4" /> Add branch
                    </Btn>
                }
            />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {branches.map((b) => (
                    <article
                        key={b.id}
                        className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5"
                    >
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-extrabold">{b.name}</h2>
                            {!b.is_active && (
                                <span className="rounded-full bg-[#F1F0EC] px-2 py-0.5 text-[11px] font-bold text-muted-ink">
                                    Hidden
                                </span>
                            )}
                            <span className="ml-auto flex">
                                <button
                                    type="button"
                                    onClick={() => setEditing(b)}
                                    className="grid size-9 place-items-center rounded-lg hover:bg-paper"
                                    aria-label={`Edit ${b.name}`}
                                >
                                    <Pencil className="size-4" />
                                </button>
                                {branches.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => remove(b)}
                                        className="grid size-9 place-items-center rounded-lg text-clay hover:bg-clay-soft"
                                        aria-label={`Remove ${b.name}`}
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                )}
                            </span>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-muted-ink">
                            <MapPin className="size-4" />
                            {[b.area, b.city].filter(Boolean).join(', ') ||
                                'No address yet'}
                        </p>
                        {b.wifi_name && (
                            <p className="flex items-center gap-2 text-sm text-muted-ink">
                                <Wifi className="size-4" />
                                {b.wifi_name}
                            </p>
                        )}
                        <p className="text-sm font-semibold text-forest">
                            {b.qr_codes_count} QR code(s)
                        </p>
                    </article>
                ))}
            </div>
            <Dialog
                open={editing !== null}
                onOpenChange={(o) => !o && setEditing(null)}
            >
                <DialogContent className="max-h-[90svh] overflow-y-auto bg-white sm:max-w-lg">
                    {editing !== null && (
                        <BranchForm
                            key={editing === 'new' ? 'new' : editing.id}
                            branch={editing === 'new' ? null : editing}
                            onDone={() => setEditing(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function BranchForm({
    branch,
    onDone,
}: {
    branch: Branch | null;
    onDone: () => void;
}) {
    const form = useForm({
        name: branch?.name ?? '',
        city: branch?.city ?? '',
        area: branch?.area ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
        wifi_name: branch?.wifi_name ?? '',
        wifi_password: branch?.wifi_password ?? '',
        latitude: branch?.latitude ?? '',
        longitude: branch?.longitude ?? '',
        google_review_url: branch?.google_review_url ?? '',
        is_active: branch?.is_active ?? true,
    });
    const { data, setData, errors } = form;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onDone };
        if (branch) form.put(`/app/branches/${branch.id}`, opts);
        else form.post('/app/branches', opts);
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">
                    {branch ? `Edit ${branch.name}` : 'New branch'}
                </DialogTitle>
                <DialogDescription>
                    Each branch gets its own QR codes, feedback and stats.
                </DialogDescription>
            </DialogHeader>
            <Field label="Branch name" error={errors.name}>
                <TextInput
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                    placeholder="Al Mouj"
                />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="City" error={errors.city}>
                    <TextInput
                        value={data.city}
                        onChange={(e) => setData('city', e.target.value)}
                    />
                </Field>
                <Field label="Area" error={errors.area}>
                    <TextInput
                        value={data.area}
                        onChange={(e) => setData('area', e.target.value)}
                    />
                </Field>
            </div>
            <Field label="Address" error={errors.address}>
                <TextInput
                    value={data.address}
                    onChange={(e) => setData('address', e.target.value)}
                />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" error={errors.latitude}>
                    <TextInput
                        inputMode="decimal"
                        value={data.latitude}
                        onChange={(e) => setData('latitude', e.target.value)}
                    />
                </Field>
                <Field label="Longitude" error={errors.longitude}>
                    <TextInput
                        inputMode="decimal"
                        value={data.longitude}
                        onChange={(e) => setData('longitude', e.target.value)}
                    />
                </Field>
            </div>
            <Field label="Phone" error={errors.phone}>
                <TextInput
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Wi-Fi name" error={errors.wifi_name}>
                    <TextInput
                        value={data.wifi_name}
                        onChange={(e) => setData('wifi_name', e.target.value)}
                    />
                </Field>
                <Field label="Wi-Fi password" error={errors.wifi_password}>
                    <TextInput
                        value={data.wifi_password}
                        onChange={(e) =>
                            setData('wifi_password', e.target.value)
                        }
                    />
                </Field>
            </div>
            <Field
                label="Google review link for this branch (optional)"
                error={errors.google_review_url}
            >
                <TextInput
                    type="url"
                    value={data.google_review_url}
                    onChange={(e) =>
                        setData('google_review_url', e.target.value)
                    }
                />
            </Field>
            <CheckRow
                checked={data.is_active}
                onChange={(v) => setData('is_active', v)}
            >
                Active
            </CheckRow>
            <div className="flex gap-2">
                <Btn variant="outline" onClick={onDone}>
                    Cancel
                </Btn>
                <Btn
                    type="submit"
                    variant="forest"
                    className="flex-1"
                    disabled={form.processing}
                >
                    {branch ? 'Save branch' : 'Add branch'}
                </Btn>
            </div>
        </form>
    );
}
