import { Head, usePage } from '@inertiajs/react';

export default function MenuUnavailable({ name }: { name: string }) {
    const { brand } = usePage().props;

    return (
        <div className="grid min-h-svh place-items-center bg-paper px-6 text-center text-ink">
            <Head title={name} />
            <div className="max-w-sm">
                <h1 className="font-display text-3xl font-extrabold">{name}</h1>
                <p className="mt-3 text-muted-ink">This menu is temporarily unavailable. Please ask a member of staff.</p>
                <p className="mt-2 font-arabic text-muted-ink" dir="rtl" lang="ar">القائمة غير متاحة مؤقتاً. يرجى التواصل مع أحد الموظفين.</p>
                <p className="mt-8 text-xs text-muted-ink">{brand.name}</p>
            </div>
        </div>
    );
}
