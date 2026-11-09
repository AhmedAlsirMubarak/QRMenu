import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import {
    Btn,
    Field,
    SelectInput,
    TextInput,
} from '@/components/platform/fields';
import { PageHeader } from '@/components/platform/side-nav';

type Props = {
    settings: {
        brand_name: string;
        brand_logo: string | null;
        support_email: string | null;
        default_currency: string;
        trial_days: number;
        notify_plan_expiry?: boolean;
        notify_invoices?: boolean;
        notify_admin_digest?: boolean;
        notify_winback?: boolean;
        auto_delete_expired?: boolean;
    };
    currencies: string[];
};

export default function AdminSettings({ settings, currencies }: Props) {
    const { data, setData, post, processing, errors } = useForm<{
        brand_name: string;
        support_email: string;
        default_currency: string;
        trial_days: string;
        brand_logo: File | null;
        notify_plan_expiry: boolean;
        notify_invoices: boolean;
        notify_admin_digest: boolean;
        notify_winback: boolean;
        auto_delete_expired: boolean;
    }>({
        brand_name: settings.brand_name ?? '',
        support_email: settings.support_email ?? '',
        default_currency: settings.default_currency ?? 'OMR',
        trial_days: String(settings.trial_days ?? 14),
        brand_logo: null,
        notify_plan_expiry: settings.notify_plan_expiry ?? true,
        notify_invoices: settings.notify_invoices ?? true,
        notify_admin_digest: settings.notify_admin_digest ?? true,
        notify_winback: settings.notify_winback ?? true,
        auto_delete_expired: settings.auto_delete_expired ?? true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/settings', { preserveScroll: true, forceFormData: true });
    };

    return (
        <>
            <Head title="Settings" />
            <PageHeader
                title="Platform settings"
                description="Brand name and logo are used on the website, dashboards and customer menus."
            />
            <form
                onSubmit={submit}
                className="flex max-w-xl flex-col gap-4 rounded-2xl border border-line bg-white p-6"
            >
                <Field label="Brand name" error={errors.brand_name}>
                    <TextInput
                        value={data.brand_name}
                        onChange={(e) => setData('brand_name', e.target.value)}
                        required
                    />
                </Field>
                <Field label="Brand logo" error={errors.brand_logo}>
                    <div className="flex items-center gap-3">
                        {settings.brand_logo && (
                            <img
                                src={settings.brand_logo}
                                alt="Current logo"
                                className="size-12 rounded-xl object-cover"
                            />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setData(
                                    'brand_logo',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="text-sm"
                        />
                    </div>
                </Field>
                <Field label="Support email" error={errors.support_email}>
                    <TextInput
                        type="email"
                        value={data.support_email}
                        onChange={(e) =>
                            setData('support_email', e.target.value)
                        }
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label="Default currency"
                        error={errors.default_currency}
                    >
                        <SelectInput
                            value={data.default_currency}
                            onChange={(e) =>
                                setData('default_currency', e.target.value)
                            }
                        >
                            {currencies.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field
                        label="Default free trial (days)"
                        error={errors.trial_days}
                    >
                        <TextInput
                            inputMode="numeric"
                            value={data.trial_days}
                            onChange={(e) =>
                                setData('trial_days', e.target.value)
                            }
                        />
                    </Field>
                </div>
                <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                    <legend className="px-1 text-[13px] font-bold">Billing emails <span className="font-medium text-muted-ink">— sent every morning at 9:00</span></legend>
                    {([
                        ['notify_plan_expiry', 'Remind restaurant owners when their trial or plan ends', '7, 3 and 1 day before, and on the day it ends.'],
                        ['notify_invoices', 'Remind restaurant owners about unpaid invoices', '3 days before the due date, on the due date, then 3 and 7 days late.'],
                        ['notify_admin_digest', 'Send me a daily billing summary', 'Plans ending soon, plans that just ended and unpaid invoices — to the support email above.'],
                        ['notify_winback', 'Send a “your menu is still here” email', '14 days after a menu goes offline, inviting the owner to renew.'],
                        ['auto_delete_expired', 'Delete expired accounts after 90 days', 'Owners are warned at 60 and 85 days. Menu, photos and stats are erased; invoices stay in Finance.'],
                    ] as const).map(([key, title, hint]) => (
                        <label key={key} className="flex cursor-pointer items-start gap-3">
                            <input type="checkbox" checked={data[key]} onChange={(e) => setData(key, e.target.checked)} className="mt-0.5 size-[18px] accent-forest" />
                            <span>
                                <span className="block text-sm font-bold">{title}</span>
                                <span className="block text-xs text-muted-ink">{hint}</span>
                            </span>
                        </label>
                    ))}
                </fieldset>
                <Btn
                    type="submit"
                    variant="forest"
                    className="h-12 self-start px-6"
                    disabled={processing}
                >
                    Save settings
                </Btn>
            </form>
        </>
    );
}
