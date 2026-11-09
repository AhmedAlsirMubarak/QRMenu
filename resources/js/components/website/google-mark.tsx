import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Google's "G" icon from public/images/g-logo.svg (the file already includes its round grey background).
 * If the file is missing, a gold star in a white circle is shown instead.
 */
export function GoogleMark({ className }: { className?: string }) {
    const [missing, setMissing] = useState(false);

    if (missing) {
        return (
            <span className={cn('grid shrink-0 place-items-center rounded-full border border-line bg-white', className)}>
                <Star className="size-[45%] fill-saffron text-saffron" />
            </span>
        );
    }

    return <img src="/images/g-logo.svg" alt="Google" onError={() => setMissing(true)} className={cn('shrink-0 rounded-full object-contain', className)} />;
}
