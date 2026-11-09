<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use App\Models\SiteSetting;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Emails the platform team when someone sends the website's contact form. Replying goes straight to the sender. */
class ContactMessageReceived extends Notification
{
    public function __construct(public ContactMessage $contact) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $c = $this->contact;
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $topic = ContactMessage::TOPICS[$c->topic] ?? $c->topic;

        return (new MailMessage)
            ->subject("[{$brand}] {$topic}: {$c->name}")
            ->replyTo($c->email, $c->name)
            ->greeting('New message from the website')
            ->line("**Topic:** {$topic}")
            ->line("**From:** {$c->name} · {$c->email}".($c->phone ? " · {$c->phone}" : ''))
            ->when($c->company, fn ($m) => $m->line("**Business:** {$c->company}"))
            ->line('**Message:**')
            ->line($c->message)
            ->action('Open in the dashboard', route('admin.messages.index', ['open' => $c->id]))
            ->line('Reply to this email to answer them directly.');
    }
}
