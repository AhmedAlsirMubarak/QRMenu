<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Models\Subscription;
use Illuminate\Console\Command;

/**
 * Daily housekeeping: ends finished trials, moves unpaid renewals to "past due" (grace period),
 * expires them after the grace period, and flags overdue invoices.
 */
class SyncSubscriptions extends Command
{
    protected $signature = 'subscriptions:sync';

    protected $description = 'Expire trials and unpaid subscriptions, and mark overdue invoices';

    public function handle(): int
    {
        $expiredTrials = Subscription::withoutRestaurantScope()
            ->where('status', 'trialing')->whereNotNull('trial_ends_at')->where('trial_ends_at', '<', now())
            ->update(['status' => 'expired', 'expired_at' => now()]);

        $pastDue = Subscription::withoutRestaurantScope()
            ->where('status', 'active')->whereNotNull('ends_at')->where('ends_at', '<', now())
            ->update(['status' => 'past_due']);

        $expired = Subscription::withoutRestaurantScope()
            ->where('status', 'past_due')->whereNotNull('ends_at')->where('ends_at', '<', now()->subDays(Subscription::GRACE_DAYS))
            ->update(['status' => 'expired', 'expired_at' => now()]);

        $overdue = Payment::where('status', 'pending')->whereNotNull('due_date')->whereDate('due_date', '<', now())
            ->update(['status' => 'overdue']);

        $this->info("Trials ended: {$expiredTrials} · past due: {$pastDue} · expired: {$expired} · overdue invoices: {$overdue}");

        return self::SUCCESS;
    }
}
