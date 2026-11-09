<?php

return [
    // Languages a restaurant can choose as main / additional menu languages.
    'languages' => [
        'en' => ['name' => 'English', 'native' => 'English', 'dir' => 'ltr'],
        'ar' => ['name' => 'Arabic', 'native' => 'العربية', 'dir' => 'rtl'],
        'hi' => ['name' => 'Hindi', 'native' => 'हिन्दी', 'dir' => 'ltr'],
        'ur' => ['name' => 'Urdu', 'native' => 'اردو', 'dir' => 'rtl'],
        'fr' => ['name' => 'French', 'native' => 'Français', 'dir' => 'ltr'],
        'ru' => ['name' => 'Russian', 'native' => 'Русский', 'dir' => 'ltr'],
        'de' => ['name' => 'German', 'native' => 'Deutsch', 'dir' => 'ltr'],
        'tr' => ['name' => 'Turkish', 'native' => 'Türkçe', 'dir' => 'ltr'],
        'fa' => ['name' => 'Persian', 'native' => 'فارسی', 'dir' => 'rtl'],
        'zh' => ['name' => 'Chinese', 'native' => '中文', 'dir' => 'ltr'],
    ],

    // Currencies with their decimal places (OMR, KWD, BHD use 3).
    'currencies' => [
        'OMR' => ['name' => 'Omani rial', 'symbol' => 'OMR', 'symbol_ar' => 'ر.ع', 'decimals' => 3],
        'AED' => ['name' => 'UAE dirham', 'symbol' => 'AED', 'symbol_ar' => 'د.إ', 'decimals' => 2],
        'SAR' => ['name' => 'Saudi riyal', 'symbol' => 'SAR', 'symbol_ar' => 'ر.س', 'decimals' => 2],
        'QAR' => ['name' => 'Qatari riyal', 'symbol' => 'QAR', 'symbol_ar' => 'ر.ق', 'decimals' => 2],
        'KWD' => ['name' => 'Kuwaiti dinar', 'symbol' => 'KWD', 'symbol_ar' => 'د.ك', 'decimals' => 3],
        'BHD' => ['name' => 'Bahraini dinar', 'symbol' => 'BHD', 'symbol_ar' => 'د.ب', 'decimals' => 3],
        'USD' => ['name' => 'US dollar', 'symbol' => '$', 'symbol_ar' => '$', 'decimals' => 2],
        'EUR' => ['name' => 'Euro', 'symbol' => '€', 'symbol_ar' => '€', 'decimals' => 2],
    ],

    // Used for time-limited categories (e.g. breakfast 7–11).
    'timezone' => env('MENU_TIMEZONE', 'Asia/Muscat'),

    'themes' => ['saffron' => 'Saffron', 'noir' => 'Noir', 'garden' => 'Garden'],
];
