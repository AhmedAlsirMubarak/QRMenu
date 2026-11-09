<?php

namespace App\Notifications;

use App\Models\Restaurant;
use App\Models\SiteSetting;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Sent when someone is added to a restaurant team. New users get a "set your password" link. */
class StaffInvitation extends Notification
{
    public function __construct(
        public Restaurant $restaurant,
        public string $role,
        public string $invitedBy,
        public ?string $passwordToken = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $url = $this->passwordToken
            ? route('password.reset', ['token' => $this->passwordToken, 'email' => $notifiable->email])
            : route('login');

        return (new MailMessage)
            ->subject("You’ve been added to {$this->restaurant->name} on {$brand}")
            ->greeting('Hello '.$notifiable->name.',')
            ->line("{$this->invitedBy} added you to the {$this->restaurant->name} team as ".ucfirst($this->role).'.')
            ->line($this->passwordToken
                ? 'Choose a password to activate your account. The link expires in 60 minutes — ask for a new one from the login page if it does.'
                : 'Sign in with your existing account to start.')
            ->action($this->passwordToken ? 'Set your password' : 'Sign in', $url);
    }
}
