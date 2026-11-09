<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use Illuminate\Database\Seeder;

/** Two starter articles so the blog isn't empty in development. Edit or delete them in Admin › Blog. */
class BlogSeeder extends Seeder
{
    public function run(): void
    {
        BlogPost::firstOrCreate(['slug' => 'get-more-google-reviews'], [
            'title' => ['en' => 'How to get more Google reviews without asking awkwardly', 'ar' => 'كيف تحصل على تقييمات جوجل دون إحراج'],
            'excerpt' => ['en' => 'Make reviewing effortless for every guest — and never filter who you ask.', 'ar' => 'اجعل التقييم سهلاً لكل ضيف — ولا تنتقِ من تطلب منه.'],
            'body' => ['en' => "Most happy guests never leave a review. Not because they don’t want to — because nobody made it easy.\n\n## Put the link where guests already are\n\nA review button on your menu reaches every table, at the moment the meal is fresh in their mind.\n\n## Ask everyone the same way\n\nGoogle doesn’t allow review gating — only asking guests who were happy. Show the same review button to every guest.\n\n## Fix problems privately and fast\n\n- Collect private feedback alongside the public link\n- Get an alert for low ratings while the guest is still there\n- Reply to every Google review, good or bad\n\n> A quick, sincere fix often turns a 2-star evening into a 5-star review.", 'ar' => "معظم الضيوف السعداء لا يكتبون تقييماً، لأن أحداً لم يجعل الأمر سهلاً.\n\n## ضع الرابط حيث يوجد الضيف\n\nزر التقييم في القائمة يصل إلى كل طاولة في اللحظة المناسبة.\n\n## اطلب من الجميع بالطريقة نفسها\n\nلا تسمح جوجل بانتقاء الضيوف الراضين فقط. اعرض زر التقييم نفسه لكل ضيف."],
            'category' => 'Guides', 'is_featured' => true, 'published_at' => now()->subDays(3),
        ]);

        BlogPost::firstOrCreate(['slug' => 'writing-dish-descriptions'], [
            'title' => ['en' => 'Writing dish descriptions that sell, in Arabic and English', 'ar' => 'كتابة أوصاف أطباق تبيع، بالعربية والإنجليزية'],
            'excerpt' => ['en' => 'Short, specific and honest beats long and flowery — in both languages.', 'ar' => 'القصير والمحدد والصادق أفضل من الطويل المزخرف — باللغتين.'],
            'body' => ['en' => "Guests decide in seconds. A good description answers three questions: what is it, what makes it special, and is it right for me?\n\n## Lead with the hero ingredient\n\n*Slow-roasted lamb, saffron rice* tells a guest more than *Our famous traditional dish*.\n\n## Translate meaning, not words\n\nArabic and English menus should feel natural to each reader. Write each one, rather than translating word for word.\n\n## Label clearly\n\n- Mark vegetarian, vegan and spicy dishes\n- List allergens — guests with allergies will thank you"],
            'category' => 'Menu design', 'published_at' => now()->subDays(10),
        ]);
    }
}
