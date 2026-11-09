<?php

namespace App\Jobs;

use App\Models\CustomerFeedback;
use App\Notifications\LowRatingAlert;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Notification;

/**
 * Emails the restaurant about a low rating while the guest may still be at the table.
 * Goes to the alert email set on Feedback (or, if empty, the restaurant's owners).
 * Dispatched "after response" so the guest never waits and no queue worker is required.
 */
class SendLowRatingAlert
{
    use Dispatchable;

    public function __construct(public int $feedbackId) {}

    public function handle(): void
    {
        $feedback = CustomerFeedback::withoutRestaurantScope()->with(['restaurant', 'branch'])->find($this->feedbackId);
        if (! $feedback || $feedback->alert_sent_at || ! $feedback->restaurant) {
            return;
        }

        $restaurant = $feedback->restaurant;
        $alerts = $restaurant->setting('feedback', []);
        $threshold = (int) ($alerts['alert_threshold'] ?? 2);

        if ($threshold < 1 || ($feedback->lowestRating() ?? 5) > $threshold) {
            return;
        }

        $recipients = filled($alerts['alert_email'] ?? null)
            ? [$alerts['alert_email']]
            : $restaurant->users()->wherePivot('role', 'owner')->pluck('email')->all();

        if ($recipients === []) {
            return;
        }

        $where = trim(($feedback->branch?->name ?? '').($feedback->qrCode?->table_label ? ' · '.$feedback->qrCode->table_label : ''));

        Notification::route('mail', $recipients)->notify(new LowRatingAlert(
            $feedback, $where, $this->summary($feedback), url('/app/feedback?highlight='.$feedback->id),
        ));

        $feedback->forceFill(['alert_sent_at' => now()])->save();
    }

    protected function summary(CustomerFeedback $f): string
    {
        return collect([
            'Overall' => $f->overall_rating, 'Food' => $f->food_rating,
            'Service' => $f->service_rating, 'Cleanliness' => $f->cleanliness_rating,
        ])->filter()->map(fn ($v, $k) => "{$k} {$v}/5")->implode(', ');
    }
}
