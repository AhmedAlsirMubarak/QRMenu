<?php

namespace App\Notifications;

use App\Models\Payment;
use App\Models\SiteSetting;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** To restaurant owners: an invoice is due soon, due today, or overdue. */
class InvoiceReminder extends Notification
{
    /** @param 'soon'|'today'|'overdue' $stage */
    public function __construct(public Payment $payment, public string $stage) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $p = $this->payment->loadMissing('restaurant');
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $amount = number_format((float) $p->amount, in_array($p->currency, ['OMR', 'KWD', 'BHD'], true) ? 3 : 2).' '.$p->currency;
        $due = $p->due_date?->format('j F Y');

        [$subject, $line] = match ($this->stage) {
            'soon' => ["Invoice {$p->invoice_number} is due on {$due}", "This is a friendly reminder that invoice **{$p->invoice_number}** for {$amount} is due on {$due}."],
            'today' => ["Invoice {$p->invoice_number} is due today", "Invoice **{$p->invoice_number}** for {$amount} is due today."],
            default => ["Overdue: invoice {$p->invoice_number}", "Invoice **{$p->invoice_number}** for {$amount} was due on {$due} and is still unpaid. Please pay it soon to keep your menu online."],
        };

        return (new MailMessage)
            ->subject("{$p->restaurant?->name}: {$subject}")
            ->greeting('Hello '.$notifiable->name.',')
            ->line($line)
            ->when($p->description, fn ($m) => $m->line('For: '.$p->description))
            ->action('View invoice', route('restaurant.billing.invoice', $p))
            ->line("Already paid? Reply to this email with your payment reference and we’ll update it — the {$brand} team.");
    }
}
