<?php

namespace App\Notifications;

use App\Models\CustomerFeedback;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowRatingAlert extends Notification
{
    public function __construct(
        public CustomerFeedback $feedback,
        public string $where,
        public string $summary,
        public string $link,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $restaurant = $this->feedback->restaurant;

        return (new MailMessage)
            ->subject("Low rating at {$restaurant->name}".($this->where ? " — {$this->where}" : ''))
            ->greeting('A guest just left a low rating')
            ->line($this->summary)
            ->when($this->feedback->comment, fn ($m) => $m->line('“'.$this->feedback->comment.'”'))
            ->when(! $this->feedback->is_anonymous && $this->feedback->contact, fn ($m) => $m->line('Guest contact: '.$this->feedback->contact))
            ->line('If they are still at the table, now is the moment to make it right.')
            ->action('Open feedback', $this->link);
    }
}
