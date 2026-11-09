import type { Auth } from '@/types/auth';
import type { CurrentRestaurant } from '@/types/platform';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth & { isSuperAdmin: boolean };
            brand: { name: string; logo: string | null };
            adminInbox?: number | null;
            restaurant: CurrentRestaurant | null;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
