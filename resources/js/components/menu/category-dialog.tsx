import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { ImagePicker } from '@/components/menu/image-picker';
import { TranslatedInput } from '@/components/menu/translated-input';
import { Btn, CheckRow, Field, TextInput } from '@/components/platform/fields';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { LanguageOption, MenuCategory, Translations } from '@/types';

type Props = {
    open: boolean;
    onClose: () => void;
    category: MenuCategory | null;
    languages: string[];
    mainLanguage: string;
    languageInfo: Record<string, LanguageOption>;
};

export function CategoryDialog(props: Props) {
    return (
        <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
            <DialogContent className="max-h-[90svh] overflow-y-auto bg-white sm:max-w-lg">
                {props.open && (
                    <CategoryForm
                        key={props.category?.id ?? 'new'}
                        {...props}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function CategoryForm({
    category,
    onClose,
    languages,
    mainLanguage,
    languageInfo,
}: Props) {
    const form = useForm<{
        name: Translations;
        description: Translations;
        is_active: boolean;
        available_from: string;
        available_until: string;
        image: File | null;
        remove_image: boolean;
    }>({
        name: category?.name ?? {},
        description: category?.description ?? {},
        is_active: category?.is_active ?? true,
        available_from: category?.available_from?.slice(0, 5) ?? '',
        available_until: category?.available_until?.slice(0, 5) ?? '',
        image: null,
        remove_image: false,
    });
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: onClose,
        };
        if (category) {
            form.transform((d) => ({ ...d, _method: 'put' }));
            form.post(`/app/menu/categories/${category.id}`, opts);
        } else {
            form.post('/app/menu/categories', opts);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
                <DialogTitle className="font-display text-2xl font-extrabold">
                    {category ? 'Edit category' : 'New category'}
                </DialogTitle>
                <DialogDescription>
                    Categories are the sections guests tap through, like
                    Breakfast or Drinks.
                </DialogDescription>
            </DialogHeader>
            <TranslatedInput
                label="Name"
                value={form.data.name}
                onChange={(v) => form.setData('name', v)}
                languages={languages}
                mainLanguage={mainLanguage}
                languageInfo={languageInfo}
                errors={errors}
                errorKey="name"
                placeholder="Breakfast"
            />
            <ImagePicker
                label="Cover image (optional)"
                aspect="aspect-[3/1]"
                currentUrl={category?.image_url ?? null}
                file={form.data.image}
                removed={form.data.remove_image}
                onFile={(f) =>
                    form.setData((d) => ({
                        ...d,
                        image: f,
                        remove_image: false,
                    }))
                }
                onRemove={() => form.setData('remove_image', true)}
                error={errors.image}
            />
            <div className="grid grid-cols-2 gap-3">
                <Field
                    label="Shown from (optional)"
                    error={errors.available_from}
                >
                    <TextInput
                        type="time"
                        value={form.data.available_from}
                        onChange={(e) =>
                            form.setData('available_from', e.target.value)
                        }
                    />
                </Field>
                <Field label="Until" error={errors.available_until}>
                    <TextInput
                        type="time"
                        value={form.data.available_until}
                        onChange={(e) =>
                            form.setData('available_until', e.target.value)
                        }
                    />
                </Field>
            </div>
            <CheckRow
                checked={form.data.is_active}
                onChange={(v) => form.setData('is_active', v)}
            >
                Visible on the menu
            </CheckRow>
            <div className="flex gap-2">
                <Btn variant="outline" onClick={onClose}>
                    Cancel
                </Btn>
                <Btn
                    type="submit"
                    variant="forest"
                    className="flex-1"
                    disabled={form.processing}
                >
                    {category ? 'Save' : 'Add category'}
                </Btn>
            </div>
        </form>
    );
}
