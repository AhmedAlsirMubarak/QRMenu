import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import RestaurantLayout from '@/layouts/restaurant-layout';

/** Account settings live inside the shell the user already knows: super admin or restaurant dashboard. */
export default function AccountLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return auth.isSuperAdmin ? <AdminLayout>{children}</AdminLayout> : <RestaurantLayout>{children}</RestaurantLayout>;
}
