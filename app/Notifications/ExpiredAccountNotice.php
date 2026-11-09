<?php

namespace App\Notifications;

use App\Models\SiteSetting;
use App\Models\Subscription;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** After a plan has expired: the win-back email, then the two data-deletion warnings. */
class ExpiredAccountNotice extends Notification
{
    /** @param 'winback'|'warning' $stage */
    public function __construct(public Subscription $subscription, public string $stage, public ?string $deleteOn = null) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $restaurant = $this->subscription->loadMissing('restaurant')->restaurant;
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $mail = (new MailMessage)->greeting('Hello '.$notifiable->name.',');

        if ($this->stage === 'winback') {
            return $mail
                ->subject("{$restaurant->name}: your menu is still here")
                ->line("Your menu, photos and QR codes for **{$restaurant->name}** are saved exactly as you left them.")
                ->line('Renew any time and everything comes back online instantly — the QR codes on your tables start working again, nothing to reprint.')
                ->action('Renew now', route('restaurant.billing.index'))
                ->line("Need a different plan or have a question? Just reply — the {$brand} team.");
        }

        return $mail
            ->subject("{$restaurant->name}: your menu will be deleted on {$this->deleteOn}")
            ->line("Your plan for **{$restaurant->name}** has expired, and your menu has been offline since then.")
            ->line("If it isn’t renewed, your menu, photos, branches, QR codes, feedback and statistics will be **permanently deleted on {$this->deleteOn}**. Printed QR codes will stop working for good.")
            ->line('Renew before then to keep everything — or export your menu from the dashboard (Import / Export) to keep a copy.')
            ->action('Renew and keep my menu', route('restaurant.billing.index'))
            ->line("Questions? Reply to this email — the {$brand} team.");
    }
}
