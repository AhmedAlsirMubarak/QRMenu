<?php

/*
| Default public-website content (English + Arabic). The super admin edits it in Admin › Website CMS;
| edits are stored in the `pages` table and merged over these defaults section by section.
| Section `type` drives the layout; `content.{lang}` holds the text.
*/

return [
    'home' => [
        'seo' => [
            'en' => ['title' => 'Bilingual QR menus for restaurants & cafés', 'description' => 'Arabic & English QR menus, customer feedback, Google reviews and menu analytics — no app, no reprinting.'],
            'ar' => ['title' => 'قوائم QR ثنائية اللغة للمطاعم والمقاهي', 'description' => 'قوائم QR بالعربية والإنجليزية، تقييمات العملاء، مراجعات جوجل وتحليلات القائمة — بدون تطبيق وبدون إعادة طباعة.'],
        ],
        'sections' => [
            ['type' => 'hero', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Your menu, one scan away.', 'highlight' => 'Your reviews, too.', 'subtitle' => 'Beautiful bilingual QR menus for restaurants and cafés. Update prices in seconds, collect honest feedback, and send guests to your Google reviews — no app, no reprinting.', 'primary_cta' => 'Start your free trial', 'secondary_cta' => 'See a live menu', 'note' => 'No credit card required'],
                'ar' => ['title' => 'قائمتك على بُعد مسحة.', 'highlight' => 'وتقييماتك أيضاً.', 'subtitle' => 'قوائم QR أنيقة بلغتين للمطاعم والمقاهي. عدّل الأسعار في ثوانٍ، واجمع آراء ضيوفك بصدق، ووجّههم لتقييمك على جوجل — بدون تطبيق وبدون إعادة طباعة.', 'primary_cta' => 'ابدأ تجربتك المجانية', 'secondary_cta' => 'شاهد قائمة حقيقية', 'note' => 'لا حاجة لبطاقة ائتمان'],
            ]],
            ['type' => 'highlights', 'enabled' => true, 'content' => [
                'en' => ['items' => ['No app download', 'Arabic · English · more', 'Any currency — OMR, AED, SAR…', 'Unlimited QR scans', 'Multi-branch']],
                'ar' => ['items' => ['بدون تحميل تطبيق', 'عربي · إنجليزي · والمزيد', 'أي عملة — ر.ع، د.إ، ر.س…', 'مسحات غير محدودة', 'فروع متعددة']],
            ]],
            ['type' => 'features', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Everything a modern menu needs. Nothing a POS does.', 'subtitle' => 'Focused on what guests see — and what owners need to learn from it.', 'items' => [
                    ['title' => 'Pick your main language, add as many as you like', 'text' => 'Full right-to-left Arabic layout. Guests switch with one tap.'],
                    ['title' => 'Google reviews, built in', 'text' => 'Show your rating and give every guest a one-tap path to review you on Google.'],
                    ['title' => 'Smart feedback', 'text' => 'Guests rate food, service and cleanliness privately — and you get an alert for low ratings.'],
                    ['title' => 'Import from Excel or CSV', 'text' => 'Bring 500 dishes in at once. Preview, fix errors, then publish.'],
                    ['title' => 'Plate Story', 'text' => 'Guests turn their dish into an Instagram story with your name on it.'],
                    ['title' => 'Menu analytics', 'text' => 'Scans vs. real browsing, most-viewed dishes, busiest hours, branch comparison.'],
                ], 'plate_story' => [
                    'eyebrow' => 'Only on QRMenu · Plate Story',
                    'title' => 'Every plate becomes free advertising',
                    'text' => 'Guests snap their dish — before and after — straight from your menu. We turn it into a ready-to-post Instagram story with your name, the dish and your menu link.',
                    'points' => [
                        'Camera built into the menu — no app to download',
                        'Story cards in your colours, sized for Instagram & WhatsApp',
                        'Optional reward for sharing, like a free karak',
                        'You approve photos before they appear on your menu',
                    ],
                    'cta' => 'Try it on a live menu',
                ]],
                'ar' => ['title' => 'كل ما تحتاجه القائمة الحديثة. لا شيء من أنظمة نقاط البيع.', 'subtitle' => 'نركّز على ما يراه الضيف — وما يحتاج صاحب المطعم أن يعرفه.', 'items' => [
                    ['title' => 'اختر لغتك الأساسية وأضف ما تشاء', 'text' => 'تصميم عربي كامل من اليمين إلى اليسار. يبدّل الضيف اللغة بلمسة.'],
                    ['title' => 'تقييمات جوجل مدمجة', 'text' => 'اعرض تقييمك وامنح كل ضيف طريقاً سريعاً لتقييمك على جوجل.'],
                    ['title' => 'آراء ذكية', 'text' => 'يقيّم الضيوف الطعام والخدمة والنظافة بشكل خاص — وتصلك تنبيهات عند التقييم المنخفض.'],
                    ['title' => 'استيراد من Excel أو CSV', 'text' => 'أدخل 500 طبق دفعة واحدة. راجع وصحّح ثم انشر.'],
                    ['title' => 'قصة الطبق', 'text' => 'يحوّل الضيوف أطباقهم إلى قصة إنستغرام تحمل اسمك.'],
                    ['title' => 'تحليلات القائمة', 'text' => 'المسحات مقابل التصفح الفعلي، الأطباق الأكثر مشاهدة، أوقات الذروة، ومقارنة الفروع.'],
                ], 'plate_story' => [
                    'eyebrow' => 'حصرياً على QRMenu · قصة الطبق',
                    'title' => 'كل طبق يصبح إعلاناً مجانياً',
                    'text' => 'يصوّر الضيوف أطباقهم — قبل وبعد — مباشرة من قائمتك، ونحوّلها إلى قصة إنستغرام جاهزة تحمل اسم مطعمك والطبق ورابط القائمة.',
                    'points' => [
                        'كاميرا مدمجة في القائمة — بدون تحميل تطبيق',
                        'بطاقات قصص بألوانك ومقاس إنستغرام وواتساب',
                        'مكافأة اختيارية عند المشاركة، مثل كرك مجاني',
                        'توافق على الصور قبل ظهورها في قائمتك',
                    ],
                    'cta' => 'جرّبها على قائمة حقيقية',
                ]],
            ]],
            ['type' => 'how', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Live in an afternoon', 'steps' => [
                    ['title' => 'Build or import your menu', 'text' => 'Choose your currency and languages, add categories and dishes, or drop in a spreadsheet.'],
                    ['title' => 'Print your QR codes', 'text' => 'One per branch or per table, with your logo. The link never changes.'],
                    ['title' => 'Learn from every table', 'text' => 'See what guests look at, how they rate you, and where to improve.'],
                ]],
                'ar' => ['title' => 'جاهز خلال ساعات', 'steps' => [
                    ['title' => 'أنشئ قائمتك أو استوردها', 'text' => 'اختر العملة واللغات، وأضف الأقسام والأطباق، أو ارفع ملف Excel.'],
                    ['title' => 'اطبع رموز QR', 'text' => 'رمز لكل فرع أو لكل طاولة مع شعارك. الرابط لا يتغير أبداً.'],
                    ['title' => 'تعلّم من كل طاولة', 'text' => 'اعرف ما يشاهده الضيوف وكيف يقيّمونك وأين يمكنك التحسين.'],
                ]],
            ]],
            ['type' => 'clients', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Menus our clients love', 'link' => 'See all our clients'],
                'ar' => ['title' => 'قوائم يحبها عملاؤنا', 'link' => 'شاهد جميع عملائنا'],
            ]],
            ['type' => 'pricing', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Simple pricing', 'subtitle' => 'Start with a free trial. Upgrade when you’re ready.', 'cta' => 'Start free', 'popular' => 'Most popular', 'per_month' => '/ month'],
                'ar' => ['title' => 'أسعار بسيطة', 'subtitle' => 'ابدأ بتجربة مجانية وترقَّ عندما تكون جاهزاً.', 'cta' => 'ابدأ مجاناً', 'popular' => 'الأكثر طلباً', 'per_month' => '/ شهرياً'],
            ]],
            ['type' => 'faq', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Questions', 'items' => [
                    ['q' => 'Do I need to reprint QR codes when my menu changes?', 'a' => 'No. Each QR code points to a permanent link. Prices, dishes and photos update instantly.'],
                    ['q' => 'Can my menu be in Arabic and English?', 'a' => 'Yes — choose a main language and add others. Arabic shows right-to-left automatically.'],
                    ['q' => 'Can I import my existing menu?', 'a' => 'Yes. Upload an Excel or CSV file; you’ll see a preview with any errors before anything changes.'],
                    ['q' => 'Do guests need an app?', 'a' => 'No. The menu opens in the phone’s browser straight from the QR code.'],
                ]],
                'ar' => ['title' => 'أسئلة شائعة', 'items' => [
                    ['q' => 'هل أحتاج لإعادة طباعة رموز QR عند تغيير القائمة؟', 'a' => 'لا. كل رمز يشير إلى رابط دائم، والأسعار والأطباق والصور تتحدّث فوراً.'],
                    ['q' => 'هل يمكن أن تكون القائمة بالعربية والإنجليزية؟', 'a' => 'نعم — اختر لغة أساسية وأضف غيرها، وتظهر العربية من اليمين إلى اليسار تلقائياً.'],
                    ['q' => 'هل يمكنني استيراد قائمتي الحالية؟', 'a' => 'نعم. ارفع ملف Excel أو CSV وستشاهد معاينة بالأخطاء قبل أي تغيير.'],
                    ['q' => 'هل يحتاج الضيوف إلى تطبيق؟', 'a' => 'لا. تفتح القائمة في متصفح الهاتف مباشرة من رمز QR.'],
                ]],
            ]],
            ['type' => 'cta', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Put your menu on every table today.', 'button' => 'Create your menu'],
                'ar' => ['title' => 'ضع قائمتك على كل طاولة اليوم.', 'button' => 'أنشئ قائمتك'],
            ]],
            ['type' => 'contact', 'enabled' => true, 'content' => [
                'en' => ['eyebrow' => 'Contact us', 'title' => 'Let’s talk about your menu', 'subtitle' => 'Questions about plans, advertising on Discover or getting started? Send us a message and we’ll reply within one working day.', 'phone' => '', 'whatsapp' => '', 'address' => 'Muscat, Sultanate of Oman', 'success_title' => 'Thanks — message received!', 'success_text' => 'We’ll get back to you by email shortly.'],
                'ar' => ['eyebrow' => 'تواصل معنا', 'title' => 'لنتحدث عن قائمتك', 'subtitle' => 'أسئلة عن الباقات أو الإعلان في صفحة اكتشف أو البدء؟ أرسل لنا رسالة وسنرد خلال يوم عمل واحد.', 'phone' => '', 'whatsapp' => '', 'address' => 'مسقط، سلطنة عُمان', 'success_title' => 'شكراً — وصلتنا رسالتك!', 'success_text' => 'سنرد عليك عبر البريد الإلكتروني قريباً.'],
            ]],
        ],
    ],

    'clients' => [
        'seo' => [
            'en' => ['title' => 'Our clients', 'description' => 'Restaurants and cafés serving their menus with us.'],
            'ar' => ['title' => 'عملاؤنا', 'description' => 'مطاعم ومقاهٍ تقدّم قوائمها معنا.'],
        ],
        'sections' => [
            ['type' => 'intro', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Our clients', 'subtitle' => 'Restaurants and cafés serving their menus with us. Open any menu — exactly what their guests see.', 'empty' => 'Our first client menus are on their way.'],
                'ar' => ['title' => 'عملاؤنا', 'subtitle' => 'مطاعم ومقاهٍ تقدّم قوائمها معنا. افتح أي قائمة — كما يراها ضيوفهم تماماً.', 'empty' => 'قوائم أول عملائنا في الطريق.'],
            ]],
        ],
    ],

    'blog' => [
        'seo' => [
            'en' => ['title' => 'Blog', 'description' => 'Ideas for running a better restaurant.'],
            'ar' => ['title' => 'المدونة', 'description' => 'أفكار لإدارة مطعم أفضل.'],
        ],
        'sections' => [
            ['type' => 'intro', 'enabled' => true, 'content' => [
                'en' => ['title' => 'The journal', 'subtitle' => 'Ideas for running a better restaurant in the Gulf.', 'empty' => 'The first articles are coming soon.', 'read' => 'min read'],
                'ar' => ['title' => 'المدونة', 'subtitle' => 'أفكار لإدارة مطعم أفضل في الخليج.', 'empty' => 'أول المقالات قريباً.', 'read' => 'دقائق قراءة'],
            ]],
        ],
    ],

    'marketplace' => [
        'seo' => [
            'en' => ['title' => 'Discover restaurants & cafés', 'description' => 'Find restaurants and cafés near you, see top-rated places and open their menus instantly.'],
            'ar' => ['title' => 'اكتشف المطاعم والمقاهي', 'description' => 'اعثر على المطاعم والمقاهي القريبة منك، وتصفّح الأعلى تقييماً وافتح قوائمها فوراً.'],
        ],
        'sections' => [
            ['type' => 'intro', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Find your next favourite table', 'subtitle' => 'Restaurants and cafés across Oman — open any menu before you go.'],
                'ar' => ['title' => 'اكتشف طاولتك المفضّلة القادمة', 'subtitle' => 'مطاعم ومقاهٍ في جميع أنحاء عُمان — تصفّح القائمة قبل أن تذهب.'],
            ]],
            ['type' => 'advertise', 'enabled' => true, 'content' => [
                'en' => ['title' => 'Advertise here', 'text' => 'Put your restaurant or brand in front of guests who are choosing where to eat.', 'button' => 'Contact us'],
                'ar' => ['title' => 'أعلن هنا', 'text' => 'ضع مطعمك أو علامتك أمام الضيوف وهم يختارون أين يأكلون.', 'button' => 'تواصل معنا'],
            ]],
        ],
    ],

    'contact' => [
        'seo' => [
            'en' => ['title' => 'Contact us', 'description' => 'Questions about digital menus, plans or advertising? Get in touch.'],
            'ar' => ['title' => 'تواصل معنا', 'description' => 'أسئلة عن القوائم الرقمية أو الباقات أو الإعلانات؟ تواصل معنا.'],
        ],
        'sections' => [
            ['type' => 'contact', 'enabled' => true, 'content' => [
                'en' => ['eyebrow' => 'Contact us', 'title' => 'Let’s talk about your menu', 'subtitle' => 'Questions about plans, advertising on Discover or getting started? Send us a message and we’ll reply within one working day.', 'phone' => '', 'whatsapp' => '', 'address' => 'Muscat, Sultanate of Oman', 'success_title' => 'Thanks — message received!', 'success_text' => 'We’ll get back to you by email shortly.'],
                'ar' => ['eyebrow' => 'تواصل معنا', 'title' => 'لنتحدث عن قائمتك', 'subtitle' => 'أسئلة عن الباقات أو الإعلان في صفحة اكتشف أو البدء؟ أرسل لنا رسالة وسنرد خلال يوم عمل واحد.', 'phone' => '', 'whatsapp' => '', 'address' => 'مسقط، سلطنة عُمان', 'success_title' => 'شكراً — وصلتنا رسالتك!', 'success_text' => 'سنرد عليك عبر البريد الإلكتروني قريباً.'],
            ]],
        ],
    ],

    'terms' => [
        'seo' => [
            'en' => ['title' => 'Terms of Service', 'description' => 'The terms that apply when restaurants and guests use our digital menu platform.'],
            'ar' => ['title' => 'شروط الخدمة', 'description' => 'الشروط التي تنطبق عند استخدام المطاعم والضيوف لمنصة القوائم الرقمية.'],
        ],
        'sections' => [
            ['type' => 'legal', 'enabled' => true, 'content' => [
                'en' => [
                    'title' => 'Terms of Service',
                    'updated' => 'Last updated: 1 November 2026',
                    'intro' => 'These Terms of Service ("Terms") govern your use of {brand} — our website, restaurant dashboard, digital menus, QR codes and related services (the "Service"). By creating an account or using the Service you agree to these Terms. If you use the Service on behalf of a business, you confirm that you are authorised to accept these Terms for it.',
                    'items' => [
                        ['title' => '1. The Service', 'text' => '{brand} lets restaurants, cafés and similar businesses ("Restaurants") publish digital menus that guests open by scanning a QR code or visiting a link. Features include menu management, multiple languages and branches, spreadsheet import, QR codes, guest feedback, Google review links, Plate Story, analytics and an optional public Marketplace. {brand} is not an ordering, payment or point-of-sale system, and we are not a party to any transaction between a Restaurant and its guests.'],
                        ['title' => '2. Accounts', 'text' => 'You must give accurate information when you register and keep it up to date. You are responsible for keeping your password safe and for everything done under your account, including by staff you invite. Tell us straight away if you believe your account has been accessed without permission. You must be at least 18 years old to create an account.'],
                        ['title' => '3. Plans, free trials and payment', 'text' => 'Paid features are offered on the plans shown on our pricing page. New accounts may start with a free trial; when it ends, the menu goes offline until a paid plan is active. Prices are shown in the stated currency and exclude any taxes that apply. Subscriptions are paid in advance for the chosen billing period and are invoiced by us. If a payment is late, we may suspend the menu after a short grace period. Except where the law requires otherwise, payments are non-refundable, including for partly used periods. We may change prices with at least 30 days’ notice; the new price applies from your next billing period.'],
                        ['title' => '4. Your menu content', 'text' => 'Restaurants keep ownership of the content they upload — menu items, prices, descriptions, photos, logos and other material ("Restaurant Content"). You are solely responsible for it being accurate, lawful and up to date, including prices, allergen and dietary information, and for complying with consumer-protection, food-labelling and other rules that apply to your business. You give {brand} a non-exclusive, worldwide, royalty-free licence to host, display, translate, format and distribute Restaurant Content to provide and promote the Service, including showing your restaurant on our website or Marketplace where you have chosen to appear there.'],
                        ['title' => '5. Guests, feedback and Plate Story', 'text' => 'Guests can use menus without an account. Feedback and photos submitted by guests are shared with the Restaurant concerned. Plate Story photos appear on a Restaurant’s menu only after the Restaurant approves them. Rewards offered by Restaurants for sharing are the Restaurant’s own promotion, must not be conditional on a positive review or rating, and are honoured by the Restaurant, not by {brand}. Guests must not upload content that is unlawful, offensive, or that infringes anyone’s rights or privacy.'],
                        ['title' => '6. Acceptable use', 'text' => 'You must not: use the Service for anything unlawful, misleading or harmful; upload malware or try to break, overload or gain unauthorised access to the Service; scrape or copy the Service or other users’ content at scale; post false or manipulated reviews or ratings; impersonate another business; or resell the Service without our written permission. We may remove content or suspend accounts that break these rules.'],
                        ['title' => '7. Marketplace and advertising', 'text' => 'Restaurants may choose to be listed on our public Marketplace and may buy advertising placements. Listings and rankings are generated automatically from information such as guest ratings and location, and paid placements are clearly labelled. We may refuse, pause or remove any listing or advertisement at our discretion. Advertisers are responsible for their advertisements being accurate and lawful.'],
                        ['title' => '8. Our intellectual property', 'text' => 'The Service, including its software, design, templates and brand, belongs to {brand} and its licensors. These Terms give you a limited, non-exclusive, non-transferable right to use the Service while your account is active. Any feedback or suggestions you send us may be used without obligation to you.'],
                        ['title' => '9. Privacy', 'text' => 'We process personal data in line with our Privacy Policy. Guest analytics are collected without accounts and do not identify individual guests. Where a Restaurant collects guest contact details through feedback, the Restaurant is responsible for using them lawfully.'],
                        ['title' => '10. Availability and changes', 'text' => 'We work to keep the Service available and secure, but it is provided "as is" and "as available" and may sometimes be interrupted for maintenance, updates or reasons outside our control. We may add, change or remove features. If we remove a major paid feature, we will tell you in advance.'],
                        ['title' => '11. Cancellation and termination', 'text' => 'You can stop using the Service at any time; your plan stays active until the end of the paid period. We may suspend or close an account that breaks these Terms, does not pay, or creates a risk for us or others. After an account is closed, menus and QR codes stop working, and we may delete Restaurant Content after a reasonable period. You can export your menu as a spreadsheet at any time before closure.'],
                        ['title' => '12. Liability', 'text' => 'To the extent the law allows, {brand} is not liable for indirect or consequential losses, lost profits or lost data, or for losses caused by Restaurant Content (including wrong prices or allergen information) or by guests. Our total liability for any claim relating to the Service is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.'],
                        ['title' => '13. Governing law', 'text' => 'These Terms are governed by the laws of the Sultanate of Oman, and the courts of Oman have jurisdiction over any dispute, unless a mandatory law of your country says otherwise.'],
                        ['title' => '14. Changes to these Terms', 'text' => 'We may update these Terms from time to time. We will show the date of the latest version at the top of this page and, for significant changes, notify account owners by email or in the dashboard. Continuing to use the Service after a change means you accept the updated Terms.'],
                        ['title' => '15. Contact', 'text' => 'Questions about these Terms? Contact us at {email}.'],
                    ],
                ],
                'ar' => [
                    'title' => 'شروط الخدمة',
                    'updated' => 'آخر تحديث: 1 نوفمبر 2026',
                    'intro' => 'تنظّم شروط الخدمة هذه ("الشروط") استخدامك لـ {brand} — موقعنا ولوحة تحكم المطاعم والقوائم الرقمية ورموز QR والخدمات المرتبطة بها ("الخدمة"). بإنشاء حساب أو استخدام الخدمة فإنك توافق على هذه الشروط. وإذا كنت تستخدم الخدمة نيابةً عن منشأة، فإنك تؤكد أنك مخوّل بقبول هذه الشروط عنها.',
                    'items' => [
                        ['title' => '1. الخدمة', 'text' => 'تتيح {brand} للمطاعم والمقاهي والمنشآت المماثلة ("المطاعم") نشر قوائم رقمية يفتحها الضيوف بمسح رمز QR أو زيارة رابط. تشمل الميزات إدارة القائمة وتعدد اللغات والفروع والاستيراد من الجداول ورموز QR وآراء الضيوف وروابط تقييمات جوجل وقصة الطبق والتحليلات والسوق العام الاختياري. {brand} ليست نظام طلبات أو دفع أو نقاط بيع، ولسنا طرفاً في أي معاملة بين المطعم وضيوفه.'],
                        ['title' => '2. الحسابات', 'text' => 'يجب أن تقدّم معلومات صحيحة عند التسجيل وأن تُبقيها محدّثة. أنت مسؤول عن حماية كلمة المرور وعن كل ما يتم من خلال حسابك، بما في ذلك ما يقوم به الموظفون الذين تدعوهم. أبلغنا فوراً إذا اعتقدت أن حسابك استُخدم دون إذن. يجب ألا يقل عمرك عن 18 عاماً لإنشاء حساب.'],
                        ['title' => '3. الباقات والتجربة المجانية والدفع', 'text' => 'تُقدَّم الميزات المدفوعة ضمن الباقات المعروضة في صفحة الأسعار. قد تبدأ الحسابات الجديدة بتجربة مجانية؛ وعند انتهائها تتوقف القائمة عن العمل حتى تُفعَّل باقة مدفوعة. تُعرض الأسعار بالعملة المذكورة ولا تشمل أي ضرائب مستحقة. تُدفع الاشتراكات مقدماً عن فترة الفوترة المختارة ونصدر فواتيرها. وفي حال تأخر الدفع يجوز لنا إيقاف القائمة بعد مهلة قصيرة. وما لم يقتضِ القانون خلاف ذلك، فالمبالغ المدفوعة غير قابلة للاسترداد، بما في ذلك الفترات المستخدمة جزئياً. يجوز لنا تغيير الأسعار بإشعار لا يقل عن 30 يوماً، ويسري السعر الجديد من فترة الفوترة التالية.'],
                        ['title' => '4. محتوى قائمتك', 'text' => 'تحتفظ المطاعم بملكية المحتوى الذي ترفعه — الأطباق والأسعار والأوصاف والصور والشعارات وغيرها ("محتوى المطعم"). وأنت وحدك المسؤول عن دقته وقانونيته وتحديثه، بما في ذلك الأسعار ومعلومات مسببات الحساسية والنظام الغذائي، وعن الالتزام بأنظمة حماية المستهلك وبطاقات الأغذية وغيرها مما ينطبق على نشاطك. وتمنح {brand} ترخيصاً غير حصري وعالمياً ودون مقابل لاستضافة محتوى المطعم وعرضه وترجمته وتنسيقه ونشره لتقديم الخدمة والترويج لها، بما في ذلك إظهار مطعمك على موقعنا أو في السوق إذا اخترت الظهور فيه.'],
                        ['title' => '5. الضيوف والآراء وقصة الطبق', 'text' => 'يمكن للضيوف استخدام القوائم دون حساب. تُشارَك الآراء والصور التي يرسلها الضيوف مع المطعم المعني. لا تظهر صور قصة الطبق في قائمة المطعم إلا بعد موافقته. المكافآت التي يقدمها المطعم مقابل المشاركة هي عرض ترويجي خاص به، ويجب ألا تكون مشروطة بتقييم إيجابي، ويلتزم بها المطعم لا {brand}. ويجب على الضيوف عدم رفع محتوى مخالف للقانون أو مسيء أو ينتهك حقوق الآخرين أو خصوصيتهم.'],
                        ['title' => '6. الاستخدام المقبول', 'text' => 'لا يجوز لك: استخدام الخدمة لأي غرض مخالف للقانون أو مضلل أو ضار؛ أو رفع برمجيات خبيثة أو محاولة تعطيل الخدمة أو إثقالها أو الوصول إليها دون إذن؛ أو نسخ الخدمة أو محتوى المستخدمين الآخرين على نطاق واسع؛ أو نشر تقييمات مزيفة أو متلاعب بها؛ أو انتحال صفة منشأة أخرى؛ أو إعادة بيع الخدمة دون إذن كتابي منا. ويجوز لنا حذف المحتوى أو إيقاف الحسابات المخالفة.'],
                        ['title' => '7. السوق والإعلانات', 'text' => 'يمكن للمطاعم اختيار الظهور في السوق العام وشراء مساحات إعلانية. تُنشأ القوائم والترتيب تلقائياً بناءً على معلومات مثل تقييمات الضيوف والموقع، وتُميَّز المساحات المدفوعة بوضوح. يجوز لنا رفض أي إدراج أو إعلان أو إيقافه أو حذفه وفق تقديرنا. والمعلنون مسؤولون عن دقة إعلاناتهم وقانونيتها.'],
                        ['title' => '8. ملكيتنا الفكرية', 'text' => 'الخدمة، بما في ذلك برمجياتها وتصميمها وقوالبها وعلامتها التجارية، مملوكة لـ {brand} والجهات المرخِّصة لها. تمنحك هذه الشروط حقاً محدوداً وغير حصري وغير قابل للتحويل لاستخدام الخدمة ما دام حسابك فعّالاً. ويجوز لنا استخدام أي ملاحظات أو اقتراحات ترسلها دون أي التزام تجاهك.'],
                        ['title' => '9. الخصوصية', 'text' => 'نعالج البيانات الشخصية وفق سياسة الخصوصية. تُجمع تحليلات الضيوف دون حسابات ولا تُحدّد هوية أي ضيف. وإذا جمع المطعم بيانات تواصل الضيوف من خلال الآراء، فهو مسؤول عن استخدامها بشكل قانوني.'],
                        ['title' => '10. التوفر والتغييرات', 'text' => 'نعمل على إبقاء الخدمة متاحة وآمنة، لكنها تُقدَّم "كما هي" و"حسب التوفر"، وقد تتوقف أحياناً للصيانة أو التحديث أو لأسباب خارجة عن إرادتنا. يجوز لنا إضافة ميزات أو تغييرها أو إزالتها، وإذا أزلنا ميزة مدفوعة رئيسية فسنبلغك مسبقاً.'],
                        ['title' => '11. الإلغاء وإنهاء الحساب', 'text' => 'يمكنك التوقف عن استخدام الخدمة في أي وقت، وتبقى باقتك فعّالة حتى نهاية الفترة المدفوعة. يجوز لنا إيقاف أو إغلاق أي حساب يخالف هذه الشروط أو لا يسدد المستحقات أو يشكّل خطراً علينا أو على الآخرين. وبعد إغلاق الحساب تتوقف القوائم ورموز QR عن العمل، ويجوز لنا حذف محتوى المطعم بعد مدة معقولة. ويمكنك تصدير قائمتك كجدول بيانات في أي وقت قبل الإغلاق.'],
                        ['title' => '12. المسؤولية', 'text' => 'في الحدود التي يسمح بها القانون، لا تتحمل {brand} المسؤولية عن الخسائر غير المباشرة أو التبعية أو فوات الأرباح أو فقدان البيانات، ولا عن الخسائر الناتجة عن محتوى المطعم (بما في ذلك الأسعار أو معلومات الحساسية غير الصحيحة) أو عن الضيوف. ولا تتجاوز مسؤوليتنا الإجمالية عن أي مطالبة تتعلق بالخدمة المبلغ الذي دفعته لنا خلال الأشهر الاثني عشر السابقة للمطالبة. ولا يحدّ أي بند في هذه الشروط من مسؤولية لا يجوز تحديدها قانوناً.'],
                        ['title' => '13. القانون الواجب التطبيق', 'text' => 'تخضع هذه الشروط لقوانين سلطنة عُمان، وتختص محاكم سلطنة عُمان بالنظر في أي نزاع، ما لم ينص قانون إلزامي في بلدك على خلاف ذلك.'],
                        ['title' => '14. التعديلات على الشروط', 'text' => 'قد نحدّث هذه الشروط من وقت لآخر، وسنعرض تاريخ آخر نسخة أعلى هذه الصفحة، ونبلغ أصحاب الحسابات بالتغييرات الجوهرية عبر البريد الإلكتروني أو لوحة التحكم. واستمرارك في استخدام الخدمة بعد التعديل يعني قبولك للشروط المحدّثة.'],
                        ['title' => '15. التواصل', 'text' => 'لأي استفسار حول هذه الشروط، تواصل معنا عبر {email}.'],
                    ],
                ],
            ]],
        ],
    ],

    // Navigation / footer labels
    'chrome' => [
        'en' => ['home' => 'Home', 'marketplace' => 'Discover', 'clients' => 'Our clients', 'blog' => 'Blog', 'pricing' => 'Pricing', 'login' => 'Log in', 'start' => 'Create your menu', 'dashboard' => 'Dashboard', 'rights' => 'All rights reserved.', 'terms' => 'Terms of Service', 'contact' => 'Contact', 'language' => 'العربية'],
        'ar' => ['home' => 'الرئيسية', 'marketplace' => 'اكتشف', 'clients' => 'عملاؤنا', 'blog' => 'المدونة', 'pricing' => 'الأسعار', 'login' => 'تسجيل الدخول', 'start' => 'أنشئ قائمتك', 'dashboard' => 'لوحة التحكم', 'rights' => 'جميع الحقوق محفوظة.', 'terms' => 'شروط الخدمة', 'contact' => 'تواصل معنا', 'language' => 'English'],
    ],
];
