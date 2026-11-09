import {
    BarChart3,
    Building2,
    CreditCard,
    Globe,
    LayoutDashboard,
    Inbox,
    Megaphone,
    Settings,
    Tags,
    Users,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { DashboardShell, UserFooter } from '@/components/platform/side-nav';
import type { SideNavItem } from '@/components/platform/side-nav';

const items: SideNavItem[] = [
    { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { title: 'Restaurants', href: '/admin/restaurants', icon: Building2 },
    { title: 'Plans', href: '/admin/plans', icon: Tags },
    { title: 'Finance', href: '/admin/finance', icon: CreditCard },
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Global analytics', href: '/admin/analytics', icon: BarChart3 },
    { title: 'Messages', href: '/admin/messages', icon: Inbox },
    { title: 'Website CMS', href: '/admin/website', icon: Globe },
    { title: 'Marketplace & ads', href: '/admin/marketplace', icon: Megaphone },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { adminInbox } = usePage().props;
    const nav = items.map((item) => (item.href === '/admin/messages' ? { ...item, badge: adminInbox } : item));

    return (
        <DashboardShell
            items={nav}
            tone="forest"
            eyebrow="SUPER ADMIN"
            footer={<UserFooter />}
        >
            {children}
        </DashboardShell>
    );
}
