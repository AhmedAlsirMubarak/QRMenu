<?php

namespace Tests\Feature\Platform;

use App\Models\ContactMessage;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\ContactMessageReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_contact_page_prefills_topic_and_home_has_the_form(): void
    {
        $this->get('/contact?topic=advertising')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('website/contact')->where('topic', 'advertising'));

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('page.sections.8.type', 'contact'));
    }

    public function test_message_is_saved_and_emailed_to_support(): void
    {
        Notification::fake();
        SiteSetting::put('support_email', 'hello@qrmenu.test');

        $this->post('/contact', [
            'topic' => 'advertising', 'name' => 'Sara', 'email' => 'sara@example.com', 'company' => 'Roast & Co.',
            'message' => 'We would like a banner on Discover next month.',
        ])->assertSessionHasNoErrors();

        $msg = ContactMessage::first();
        $this->assertSame('new', $msg->status);
        $this->assertSame('advertising', $msg->topic);
        Notification::assertSentOnDemand(ContactMessageReceived::class, fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'hello@qrmenu.test');
    }

    public function test_bots_and_bad_input_are_rejected(): void
    {
        $this->post('/contact', ['topic' => 'general', 'name' => 'Bot', 'email' => 'bot@example.com', 'message' => 'Buy cheap things now!!', 'website' => 'http://spam'])
            ->assertSessionHasErrors('website');
        $this->post('/contact', ['topic' => 'nope', 'name' => '', 'email' => 'not-an-email', 'message' => 'hi'])
            ->assertSessionHasErrors(['topic', 'name', 'email', 'message']);
        $this->assertSame(0, ContactMessage::count());
    }

    public function test_only_super_admins_manage_messages(): void
    {
        $msg = ContactMessage::create(['topic' => 'general', 'name' => 'Ali', 'email' => 'ali@example.com', 'message' => 'Hello there, a question.']);

        $this->actingAs(User::factory()->create())->get('/admin/messages')->assertForbidden();

        $admin = User::factory()->create();
        $admin->forceFill(['is_super_admin' => true])->save();

        $this->actingAs($admin)->get('/admin/messages')->assertInertia(fn (Assert $page) => $page
            ->component('admin/messages/index')->where('counts.new', 1)->where('adminInbox', 1));

        $this->actingAs($admin)->patch("/admin/messages/{$msg->id}", ['status' => 'replied']);
        $msg->refresh();
        $this->assertSame('replied', $msg->status);
        $this->assertSame($admin->id, $msg->handled_by);

        $this->actingAs($admin)->delete("/admin/messages/{$msg->id}");
        $this->assertSame(0, ContactMessage::count());
    }
}
