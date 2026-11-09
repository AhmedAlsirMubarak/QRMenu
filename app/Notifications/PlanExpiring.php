<?php

namespace App\Notifications;

use App\Models\SiteSetting;
use App\Models\Subscription;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** To restaurant owners: their free trial / paid plan ends soon, or has just ended. */
class PlanExpiring extends Notification
{
    public function __construct(public Subscription $subscription, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $s = $this->subscription->loadMissing('restaurant', 'plan');
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $trial = $s->status === 'trialing' || ($s->status === 'expired' && $s->trial_ends_at && ! $s->ends_at);
        $what = $trial ? 'free trial' : ($s->plan?->translate('name').' plan');
        $date = ($trial ? $s->trial_ends_at : $s->ends_at)?->format('j F Y');
        $restaurant = $s->restaurant->name;

        $mail = (new MailMessage)->greeting('Hello '.$notifiable->name.',');

        if ($this->daysLeft <= 0) {
            return $mail
                ->subject("{$restaurant}: your {$what} has ended")
                ->line("The {$what} for **{$restaurant}** ended on {$date}.")
                ->line($s->status === 'past_due'
                    ? 'Your menu stays online for a few more days while we wait for payment. After that, guests will see “menu unavailable”.'
                    : 'Your menu is now offline for guests. Everything you built is kept — renew to bring it back instantly.')
                ->action('Choose a plan', route('restaurant.billing.index'))
                ->line("Questions? Just reply to this email — the {$brand} team.");
        }

        $when = $this->daysLeft === 1 ? 'tomorrow' : "in {$this->daysLeft} days";

        return $mail
            ->subject("{$restaurant}: your {$what} ends {$when}")
            ->line("The {$what} for **{$restaurant}** ends {$when}, on {$date}.")
            ->line('To keep your menu and QR codes working without interruption, choose a plan or renew before then.')
            ->action('Go to Billing', route('restaurant.billing.index'))
            ->line("Questions? Just reply to this email — the {$brand} team.");
    }
}
