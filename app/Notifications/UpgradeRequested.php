<?php

namespace App\Notifications;

use App\Models\UpgradeRequest;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Tells the platform team that a restaurant wants to change plan. */
class UpgradeRequested extends Notification
{
    public function __construct(public UpgradeRequest $upgrade) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $u = $this->upgrade->loadMissing('plan', 'user', 'restaurant');

        return (new MailMessage)
            ->subject("Plan change request: {$u->restaurant->name} → {$u->plan->translate('name')}")
            ->line("{$u->restaurant->name} asked to move to {$u->plan->translate('name')} ({$u->billing_cycle}).")
            ->line('Requested by: '.($u->user?->name ?? '—').' · '.($u->user?->email ?? ''))
            ->when($u->message, fn ($m) => $m->line('Message: '.$u->message))
            ->action('Open Finance', route('admin.finance.index'));
    }
}
