<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Models\SiteSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Actions\Restaurants\DeleteRestaurant;
use App\Notifications\BillingDigest;
use App\Notifications\ExpiredAccountNotice;
use App\Notifications\InvoiceReminder;
use App\Notifications\PlanExpiring;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Daily emails about money:
 *  - restaurant owners: plan/trial ending in 7, 3 and 1 days, and when it has ended;
 *  - restaurant owners: invoice due in 3 days, due today, and overdue (3 and 7 days late);
 *  - restaurant owners: "your menu is still here" 14 days after it went offline, then deletion warnings at 60 and 85 days;
 *  - after 90 days offline the restaurant is permanently deleted (invoices are kept);
 *  - platform team: one summary of everything above (to the support email).
 * Every reminder is logged in sent_reminders so it is only ever sent once.
 */
class SendBillingReminders extends Command
{
    public const PLAN_DAYS = [7, 3, 1];

    /** Days after the menu went offline (subscriptions.expired_at). */
    public const WINBACK_DAY = 14;

    public const WARNING_DAYS = [60, 85];

    public const DELETE_DAY = 90;

    /** @var list<array{restaurant: string, date: string}> */
    protected array $deleted = [];

    protected $signature = 'reminders:send {--dry-run : List what would be sent without emailing}';

    protected $description = 'Email reminders for expiring plans and unpaid invoices';

    protected int $sent = 0;

    public function handle(): int
    {
        $today = Carbon::now(config('qrmenu.timezone'))->startOfDay();

        if (SiteSetting::get('notify_plan_expiry', true)) {
            $this->planReminders($today);
        }
        if (SiteSetting::get('notify_invoices', true)) {
            $this->invoiceReminders($today);
        }
        $this->expiredAccounts($today);

        if (SiteSetting::get('notify_admin_digest', true)) {
            $this->adminDigest($today);
        }

        $this->info("Reminders sent: {$this->sent}");

        return self::SUCCESS;
    }

    protected function planReminders(Carbon $today): void
    {
        Subscription::withoutRestaurantScope()
            ->whereIn('status', ['trialing', 'active', 'past_due', 'expired'])
            ->with(['restaurant', 'plan'])
            ->get()
            // Only the restaurant's current subscription, and only restaurants still in business.
            ->filter(fn (Subscription $s) => $s->restaurant && $s->restaurant->status === 'active' && $s->restaurant->subscription?->is($s))
            ->each(function (Subscription $s) use ($today) {
                $end = $s->status === 'trialing' || ($s->status === 'expired' && ! $s->ends_at) ? $s->trial_ends_at : $s->ends_at;
                if (! $end) {
                    return;
                }
                $endDay = $end->copy()->setTimezone(config('qrmenu.timezone'))->startOfDay();
                $daysLeft = (int) $today->diffInDays($endDay, false);

                if (in_array($daysLeft, self::PLAN_DAYS, true) && in_array($s->status, ['trialing', 'active'], true)) {
                    $this->once("plan:{$s->id}:{$endDay->toDateString()}:{$daysLeft}d", fn () => $this->notifyOwners($s->restaurant_id, new PlanExpiring($s, $daysLeft)));
                } elseif ($daysLeft <= 0 && $daysLeft >= -2 && in_array($s->status, ['past_due', 'expired'], true)) {
                    // Sent once, within two days of the end date (so a missed run still catches it).
                    $this->once("plan:{$s->id}:{$endDay->toDateString()}:ended", fn () => $this->notifyOwners($s->restaurant_id, new PlanExpiring($s, 0)));
                }
            });
    }

    /** Win-back email, deletion warnings and, after DELETE_DAY days offline, permanent deletion. */
    protected function expiredAccounts(Carbon $today): void
    {
        $winback = (bool) SiteSetting::get('notify_winback', true);
        $autoDelete = (bool) SiteSetting::get('auto_delete_expired', true);

        Subscription::withoutRestaurantScope()
            ->where('status', 'expired')->whereNotNull('expired_at')
            ->with('restaurant')
            ->get()
            ->filter(fn (Subscription $s) => $s->restaurant && $s->restaurant->subscription?->is($s))
            ->each(function (Subscription $s) use ($today, $winback, $autoDelete) {
                $offline = $s->expired_at->copy()->setTimezone(config('qrmenu.timezone'))->startOfDay();
                $days = (int) $offline->diffInDays($today, false);
                $deleteOn = $offline->copy()->addDays(self::DELETE_DAY);
                $stamp = $offline->toDateString();

                if ($winback && $days >= self::WINBACK_DAY && $days < self::WARNING_DAYS[0]) {
                    $this->once("expired:{$s->id}:{$stamp}:winback", fn () => $this->notifyOwners($s->restaurant_id, new ExpiredAccountNotice($s, 'winback')));
                }

                if (! $autoDelete) {
                    return;
                }

                if ($days >= self::WARNING_DAYS[0] && $days < self::WARNING_DAYS[1]) {
                    $this->once("expired:{$s->id}:{$stamp}:warn60", fn () => $this->notifyOwners($s->restaurant_id, new ExpiredAccountNotice($s, 'warning', $deleteOn->format('j F Y'))));
                } elseif ($days >= self::WARNING_DAYS[1] && $days < self::DELETE_DAY) {
                    $this->once("expired:{$s->id}:{$stamp}:warn85", fn () => $this->notifyOwners($s->restaurant_id, new ExpiredAccountNotice($s, 'warning', $deleteOn->format('j F Y'))));
                } elseif ($days >= self::DELETE_DAY) {
                    // Never delete without the final warning having gone out first (e.g. after a long scheduler outage).
                    $warned = DB::table('sent_reminders')->where('key', "expired:{$s->id}:{$stamp}:warn85")->value('sent_at');
                    if (! $warned) {
                        $this->once("expired:{$s->id}:{$stamp}:warn85", fn () => $this->notifyOwners($s->restaurant_id, new ExpiredAccountNotice($s, 'warning', $today->copy()->addDays(5)->format('j F Y'))));

                        return;
                    }
                    if (Carbon::parse($warned)->diffInDays(now()) < 5) {
                        return; // give them at least 5 days after the final warning
                    }

                    $name = $s->restaurant->name;
                    if ($this->option('dry-run')) {
                        $this->line("Would delete: {$name}");

                        return;
                    }
                    try {
                        app(DeleteRestaurant::class)->handle($s->restaurant);
                        $this->deleted[] = ['restaurant' => $name, 'date' => $today->format('j M')];
                        Log::info('Expired restaurant deleted after '.self::DELETE_DAY.' days', ['restaurant' => $name]);
                    } catch (\Throwable $e) {
                        Log::error('Automatic restaurant deletion failed', ['restaurant' => $name, 'error' => $e->getMessage()]);
                    }
                }
            });
    }

    protected function invoiceReminders(Carbon $today): void
    {
        Payment::query()
            ->whereNotNull('restaurant_id')->whereNotNull('due_date')
            ->whereIn('status', ['pending', 'overdue'])
            ->with('restaurant')
            ->get()
            ->each(function (Payment $p) use ($today) {
                // Compare calendar dates only (due dates have no time or time zone). >0 = days until due.
                $days = (int) Carbon::parse($today->toDateString())->diffInDays(Carbon::parse($p->due_date->toDateString()), false);

                $stage = match (true) {
                    $days === 3 => ['soon', 'due-3d'],
                    $days === 0 => ['today', 'due-0d'],
                    $days === -3 => ['overdue', 'late-3d'],
                    $days === -7 => ['overdue', 'late-7d'],
                    default => null,
                };

                if ($stage) {
                    $this->once("invoice:{$p->id}:{$stage[1]}", fn () => $this->notifyOwners($p->restaurant_id, new InvoiceReminder($p, $stage[0])));
                }
            });
    }

    protected function adminDigest(Carbon $today): void
    {
        $to = SiteSetting::get('support_email');
        if (! $to) {
            return;
        }

        $subs = Subscription::withoutRestaurantScope()->with(['restaurant:id,name,status', 'plan:id,name'])
            ->whereIn('status', ['trialing', 'active', 'past_due', 'expired'])->get()
            ->filter(fn ($s) => $s->restaurant && $s->restaurant->status === 'active');

        $endOf = fn (Subscription $s) => ($s->status === 'trialing' || ($s->status === 'expired' && ! $s->ends_at) ? $s->trial_ends_at : $s->ends_at)?->copy()->setTimezone(config('qrmenu.timezone'))->startOfDay();

        $expiring = $subs->filter(fn ($s) => in_array($s->status, ['trialing', 'active'], true) && ($e = $endOf($s)) && $e->between($today, $today->copy()->addDays(7)))
            ->map(fn ($s) => ['restaurant' => $s->restaurant->name, 'plan' => $s->plan?->translate('name') ?? '—', 'date' => $endOf($s)->format('j M'), 'status' => $s->status === 'trialing' ? 'trial' : 'paid'])->values()->all();

        $ended = $subs->filter(fn ($s) => in_array($s->status, ['past_due', 'expired'], true) && ($e = $endOf($s)) && $e->equalTo($today->copy()->subDay()))
            ->map(fn ($s) => ['restaurant' => $s->restaurant->name, 'plan' => $s->plan?->translate('name') ?? '—', 'date' => $endOf($s)->format('j M')])->values()->all();

        $unpaid = Payment::with('restaurant:id,name')->whereIn('status', ['pending', 'overdue'])->orderBy('due_date')->limit(50)->get()
            ->map(fn (Payment $p) => [
                'invoice' => $p->invoice_number,
                'client' => $p->restaurant?->name ?? $p->payer_name ?? '—',
                'amount' => number_format((float) $p->amount, 3).' '.$p->currency,
                'due' => $p->due_date?->format('j M') ?? '—',
                'overdue' => $p->displayStatus() === 'overdue' || $p->status === 'overdue',
            ])->all();

        $deletingSoon = Subscription::withoutRestaurantScope()->where('status', 'expired')->whereNotNull('expired_at')->with('restaurant:id,name')->get()
            ->filter(fn ($s) => $s->restaurant)
            ->map(function ($s) use ($today) {
                $on = $s->expired_at->copy()->setTimezone(config('qrmenu.timezone'))->startOfDay()->addDays(self::DELETE_DAY);

                return $on->lte($today->copy()->addDays(7)) ? ['restaurant' => $s->restaurant->name, 'date' => $on->format('j M')] : null;
            })->filter()->values()->all();
        if (! SiteSetting::get('auto_delete_expired', true)) {
            $deletingSoon = [];
        }

        if ($expiring === [] && $ended === [] && $unpaid === [] && $deletingSoon === [] && $this->deleted === []) {
            return;
        }

        $this->once("digest:{$today->toDateString()}", fn () => Notification::route('mail', $to)->notify(new BillingDigest($expiring, $ended, $unpaid, $deletingSoon, $this->deleted)));
    }

    protected function notifyOwners(int $restaurantId, \Illuminate\Notifications\Notification $notification): void
    {
        $owners = User::query()->whereHas('restaurants', fn ($q) => $q->whereKey($restaurantId)->where('restaurant_user.role', 'owner'))->get();
        Notification::send($owners, $notification);
    }

    /** Runs $send once per key; failures are logged and retried on the next run. */
    protected function once(string $key, callable $send): void
    {
        if (DB::table('sent_reminders')->where('key', $key)->exists()) {
            return;
        }

        if ($this->option('dry-run')) {
            $this->line("Would send: {$key}");

            return;
        }

        try {
            $send();
            DB::table('sent_reminders')->insert(['key' => $key, 'sent_at' => now()]);
            $this->sent++;
        } catch (\Throwable $e) {
            Log::warning('Billing reminder failed', ['key' => $key, 'error' => $e->getMessage()]);
        }
    }
}
