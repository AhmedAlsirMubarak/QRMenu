import { Camera, ImagePlus, RefreshCw, SwitchCamera } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraLabels = {
    openCamera: string;
    capture: string;
    retake: string;
    upload: string;
    switchCamera: string;
    cameraBlocked: string;
    cameraUnavailable: string;
};

type Props = {
    /** Current photo (object URL) — shown instead of the viewfinder once taken. */
    url: string | null;
    onPhoto: (file: Blob) => void;
    labels: CameraLabels;
};

type State = 'idle' | 'starting' | 'live' | 'blocked' | 'unavailable';

/**
 * Live in-page camera (getUserMedia) with a shutter button, plus “Upload photo” as a fallback.
 * Browsers only allow the camera on HTTPS (or localhost); elsewhere guests can still upload.
 */
export function CameraCapture({ url, onPhoto, labels }: Props) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<State>('idle');
    const [facing, setFacing] = useState<'environment' | 'user'>('environment');
    const [cameraCount, setCameraCount] = useState(0);

    const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

    const stop = useCallback(() => {
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
    }, []);

    const start = useCallback(
        async (mode: 'environment' | 'user' = facing) => {
            if (!supported) {
                setState('unavailable');
                return;
            }
            stop();
            setState('starting');
            try {
                const media = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1440 } },
                    audio: false,
                });
                stream.current = media;
                if (video.current) {
                    video.current.srcObject = media;
                    await video.current.play().catch(() => undefined);
                }
                setState('live');
                const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
                setCameraCount(devices.filter((d) => d.kind === 'videoinput').length);
            } catch (error) {
                const name = (error as DOMException)?.name;
                setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'unavailable');
            }
        },
        [facing, stop, supported],
    );

    // Release the camera when the sheet closes or a photo is taken.
    useEffect(() => stop, [stop]);
    useEffect(() => {
        if (url) {
            stop();
            setState('idle');
        }
    }, [url, stop]);

    const shoot = () => {
        const v = video.current;
        if (!v || !v.videoWidth) return;
        const max = 1600;
        const scale = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (facing === 'user') {
            // Selfie preview is mirrored; save the photo the way it looked on screen.
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (blob) {
                stop();
                setState('idle');
                onPhoto(blob);
            }
        }, 'image/jpeg', 0.88);
    };

    const flip = () => {
        const next = facing === 'environment' ? 'user' : 'environment';
        setFacing(next);
        void start(next);
    };

    const live = state === 'live' || state === 'starting';

    return (
        <div className="flex flex-col gap-2.5">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-[var(--hero)] text-white">
                {url && !live && <img src={url} alt="" className="absolute inset-0 size-full object-cover" />}
                <video
                    ref={video}
                    playsInline
                    muted
                    aria-label={labels.openCamera}
                    className={`absolute inset-0 size-full object-cover ${live ? '' : 'hidden'} ${facing === 'user' ? '-scale-x-100' : ''}`}
                />

                {!live && (
                    <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
                        {(state === 'blocked' || state === 'unavailable') && !url && (
                            <p className="max-w-xs text-sm text-white/85">{state === 'blocked' ? labels.cameraBlocked : labels.cameraUnavailable}</p>
                        )}
                        {supported && state !== 'blocked' && (
                            <button type="button" onClick={() => void start()} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-bold ${url ? 'bg-black/55' : 'bg-white/15'}`}>
                                {url ? <RefreshCw className="size-5" /> : <Camera className="size-5" />}
                                {url ? labels.retake : labels.openCamera}
                            </button>
                        )}
                    </div>
                )}

                {live && (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-6 bg-gradient-to-t from-black/50 to-transparent pb-4 pt-10">
                        <button
                            type="button"
                            onClick={shoot}
                            disabled={state !== 'live'}
                            aria-label={labels.capture}
                            className="grid size-[68px] place-items-center rounded-full border-4 border-white bg-white/25 disabled:opacity-50"
                        >
                            <span className="size-12 rounded-full bg-white" />
                        </button>
                        {cameraCount > 1 && (
                            <button type="button" onClick={flip} aria-label={labels.switchCamera} className="absolute end-5 grid size-11 place-items-center rounded-full bg-black/45">
                                <SwitchCamera className="size-5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex h-11 items-center justify-center gap-2 self-center rounded-full px-4 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]"
            >
                <ImagePlus className="size-4" /> {labels.upload}
            </button>
            <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                        stop();
                        setState('idle');
                        onPhoto(f);
                    }
                    e.target.value = '';
                }}
            />
        </div>
    );
}
