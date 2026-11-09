export type Translations = Record<string, string | null | undefined>;

export type CurrentRestaurant = {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    currency: string;
    main_language: string;
    languages: string[];
    role: 'owner' | 'manager' | 'editor' | null;
    menu_live?: boolean;
    subscription_status?: string | null;
    subscription_ends_at?: string | null;
    unpaid_invoices?: { id: number; number: string; amount: string; currency: string; due_date: string | null; overdue: boolean }[];
    memberships: { id: number; name: string }[];
};

export type Plan = {
    id: number;
    name: Translations;
    description: Translations | null;
    slug: string;
    price_monthly: string;
    price_yearly: string | null;
    currency: string;
    max_branches: number | null;
    max_languages: number | null;
    max_items: number | null;
    features: string[] | null;
    trial_days: number;
    is_active: boolean;
    is_public: boolean;
    is_featured: boolean;
    sort_order: number;
    active_subscriptions_count?: number;
};

export type Subscription = {
    id: number;
    status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
    billing_cycle: 'monthly' | 'yearly';
    price: string;
    currency: string;
    trial_ends_at: string | null;
    ends_at: string | null;
    plan?: Pick<Plan, 'id' | 'name'>;
};

export type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
};

export type MenuItemOption = {
    id?: number;
    type: 'size' | 'extra';
    name: Translations;
    price: string;
};

export type MenuItem = {
    id: number;
    menu_category_id: number;
    sku: string | null;
    name: Translations;
    description: Translations | null;
    price: string;
    compare_at_price: string | null;
    image_url: string | null;
    is_available: boolean;
    is_featured: boolean;
    dietary_tags: string[] | null;
    allergens: string[] | null;
    calories: number | null;
    sort_order: number;
    options: MenuItemOption[];
};

export type MenuCategory = {
    id: number;
    name: Translations;
    description: Translations | null;
    image_url: string | null;
    is_active: boolean;
    available_from: string | null;
    available_until: string | null;
    sort_order: number;
    items: MenuItem[];
};

export type LanguageOption = {
    name: string;
    native: string;
    dir: 'ltr' | 'rtl' | string;
};
export type CurrencyOption = {
    name: string;
    symbol: string;
    symbol_ar?: string;
    decimals: number;
};

export type MenuSettings = {
    name: string;
    main_language: string;
    languages: string[];
    currency: string;
    theme: string;
    logo_url: string | null;
    cover_url: string | null;
    slug: string;
};

export type PlanLimitsInfo = {
    plan: string | null;
    max_branches: number | null;
    max_languages: number | null;
    max_items: number | null;
    features: string[];
    items_used?: number;
};
