<?php

namespace Tests\Feature\Platform;

use App\Actions\Restaurants\CreateRestaurant;
use App\Models\BlogPost;
use App\Models\Restaurant;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\CurrentRestaurant;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WebsiteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();

        return $admin;
    }

    protected function restaurant(string $name = 'Bait Al Saffron'): Restaurant
    {
        $restaurant = app(CreateRestaurant::class)->handle(User::factory()->create(), [
            'name' => $name, 'main_language' => 'en', 'currency' => 'OMR',
            'plan_id' => SubscriptionPlan::where('slug', 'professional')->value('id'),
        ]);
        app(CurrentRestaurant::class)->set(null);

        return $restaurant;
    }

    public function test_home_page_shows_content_public_plans_and_showcased_clients_only(): void
    {
        SubscriptionPlan::where('slug', 'business')->update(['is_public' => false]);
        $shown = $this->restaurant('Shown Café');
        $shown->update(['is_showcased' => true]);
        $this->restaurant('Hidden Café');

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('website/home')
            ->where('page.sections.0.type', 'hero')
            ->where('page.sections.0.content.ar.title', 'قائمتك على بُعد مسحة.')
            ->has('plans', 2)
            ->has('clients', 1)
            ->where('clients.0.name', 'Shown Café'));
    }

    public function test_cms_edits_appear_on_the_site_and_html_is_stripped(): void
    {
        $sections = config('website.home.sections');
        $sections[0]['content']['en']['title'] = '<script>alert(1)</script>Menus that sell.';
        $sections[1]['enabled'] = false;
        $faq = collect($sections)->search(fn ($s) => $s['type'] === 'faq');
        $sections[$faq]['content']['en']['items'][] = ['q' => 'Is there a contract?', 'a' => 'No, cancel any time.'];

        $this->actingAs($this->admin())->put('/admin/website/home', ['sections' => $sections, 'seo' => ['en' => ['title' => 'QR menus'], 'ar' => []]])
            ->assertSessionHasNoErrors();

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('page.sections.0.content.en.title', 'alert(1)Menus that sell.')
            ->where('page.sections.1.enabled', false)
            ->where("page.sections.{$faq}.content.en.items.4.q", 'Is there a contract?')
            ->where('page.seo.en.title', 'QR menus'));

        // Reset restores the defaults.
        $this->actingAs($this->admin())->delete('/admin/website/home');
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('page.sections.0.content.en.title', 'Your menu, one scan away.'));
    }

    public function test_cms_and_blog_admin_are_super_admin_only(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->get('/admin/website')->assertForbidden();
        $this->actingAs($owner)->get('/admin/blog')->assertForbidden();
    }

    public function test_blog_drafts_are_hidden_and_published_posts_show(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/blog', ['title' => ['en' => 'Draft idea'], 'body' => ['en' => 'Text']])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/blog', [
            'title' => ['en' => 'Five menu tips', 'ar' => 'خمس نصائح'], 'body' => ['en' => "## Tip one\n\nKeep it short."],
            'published_at' => now()->subHour()->format('Y-m-d H:i'), 'category' => 'Guides',
        ])->assertSessionHasNoErrors();

        $this->get('/blog')->assertOk()->assertInertia(fn (Assert $page) => $page->has('posts.data', 1)->where('posts.data.0.slug', 'five-menu-tips'));
        $this->get('/blog/five-menu-tips')->assertOk()->assertInertia(fn (Assert $page) => $page->where('post.title.ar', 'خمس نصائح'));
        $this->get('/blog/draft-idea')->assertNotFound();
        $this->assertSame(2, BlogPost::count());
    }

    public function test_admin_can_showcase_a_restaurant(): void
    {
        $restaurant = $this->restaurant();
        $this->actingAs($this->admin())->patch("/admin/restaurants/{$restaurant->id}", ['is_showcased' => true]);

        $this->assertTrue($restaurant->fresh()->is_showcased);
        $this->assertSame('active', $restaurant->fresh()->status);
    }

    public function test_expired_trial_takes_menu_offline_and_sync_command_updates_statuses(): void
    {
        $restaurant = $this->restaurant();
        Subscription::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)
            ->update(['status' => 'trialing', 'trial_ends_at' => now()->subDay()]);

        $this->get('/'.$restaurant->slug)->assertInertia(fn (Assert $page) => $page->component('public/unavailable'));

        $this->artisan('subscriptions:sync')->assertSuccessful();
        $this->assertSame('expired', Subscription::withoutRestaurantScope()->where('restaurant_id', $restaurant->id)->value('status'));
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get('/')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
    }

    public function test_terms_page_is_editable_from_the_cms_with_long_clauses(): void
    {
        $this->get('/terms')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('website/terms')
            ->where('page.sections.0.type', 'legal')
            ->where('page.sections.0.content.en.title', 'Terms of Service'));

        $sections = config('website.terms.sections');
        $long = str_repeat('Refunds are handled case by case. ', 60); // ~2,000 characters
        $sections[0]['content']['en']['items'][] = ['title' => '16. Refunds', 'text' => $long];

        $this->actingAs($this->admin())->put('/admin/website/terms', ['sections' => $sections, 'seo' => ['en' => [], 'ar' => []]])
            ->assertSessionHasNoErrors();

        $this->get('/terms')->assertInertia(fn (Assert $page) => $page
            ->where('page.sections.0.content.en.items.15.title', '16. Refunds')
            ->where('page.sections.0.content.en.items.15.text', trim($long)));
    }
}
