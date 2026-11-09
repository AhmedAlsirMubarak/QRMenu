import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

type Props = {
    label: string;
    currentUrl: string | null;
    file: File | null;
    removed: boolean;
    onFile: (file: File | null) => void;
    onRemove: () => void;
    error?: string;
    aspect?: string;
};

export function ImagePicker({
    label,
    currentUrl,
    file,
    removed,
    onFile,
    onRemove,
    error,
    aspect = 'aspect-[4/3]',
}: Props) {
    const preview = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );
    const shown = preview ?? (removed ? null : currentUrl);

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold">{label}</span>
            <div
                className={`relative overflow-hidden rounded-2xl border border-dashed border-line-strong bg-paper ${aspect}`}
            >
                {shown ? (
                    <img
                        src={shown}
                        alt=""
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-muted-ink">
                        <span className="flex flex-col items-center gap-1">
                            <ImagePlus className="size-6" />
                            JPG, PNG or WebP · up to 4 MB
                        </span>
                    </span>
                )}
                <input
                    type="file"
                    accept="image/*"
                    aria-label={label}
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                />
                {shown && (
                    <button
                        type="button"
                        onClick={() => {
                            onFile(null);
                            onRemove();
                        }}
                        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-white/90 text-clay shadow"
                        aria-label="Remove image"
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </div>
            {error && (
                <span className="text-xs font-semibold text-clay">{error}</span>
            )}
        </div>
    );
}
