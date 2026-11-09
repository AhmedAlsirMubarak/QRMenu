<?php

use Illuminate\Support\Facades\Schedule;

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Subscription housekeeping (needs the scheduler cron on the server — see DEPLOY.md).
Schedule::command('subscriptions:sync')->dailyAt('01:00');

// Deletes Plate Story photos that are no longer needed and measures storage use per restaurant.
Schedule::command('plate-stories:cleanup')->dailyAt('03:00');

// Emails about expiring plans and unpaid invoices (to restaurant owners + a daily summary to the support email).
Schedule::command('reminders:send')->dailyAt('09:00')->timezone(config('qrmenu.timezone'));
