<?php

namespace App\Notifications;

use App\Models\SiteSetting;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Daily summary for the platform team: plans ending soon or just ended, and unpaid invoices. */
class BillingDigest extends Notification
{
    /**
     * @param list<array{restaurant: string, plan: string, date: string, status: string}> $expiring
     * @param list<array{restaurant: string, plan: string, date: string}> $ended
     * @param list<array{invoice: string, client: string, amount: string, due: string, overdue: bool}> $unpaid
     */
    public function __construct(public array $expiring, public array $ended, public array $unpaid, public array $deletingSoon = [], public array $deleted = []) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $brand = SiteSetting::get('brand_name', config('app.name'));
        $overdue = count(array_filter($this->unpaid, fn ($u) => $u['overdue']));

        $mail = (new MailMessage)
            ->subject("[{$brand}] Billing summary: ".count($this->expiring).' ending soon · '.count($this->ended).' ended · '.count($this->unpaid).' unpaid')
            ->greeting('Today’s billing summary');

        if ($this->ended !== []) {
            $mail->line('**Plans that just ended ('.count($this->ended).')**');
            foreach ($this->ended as $e) {
                $mail->line("• {$e['restaurant']} — {$e['plan']}, ended {$e['date']}");
            }
        }

        if ($this->expiring !== []) {
            $mail->line('**Ending in the next 7 days ('.count($this->expiring).')**');
            foreach ($this->expiring as $e) {
                $mail->line("• {$e['restaurant']} — {$e['plan']} ({$e['status']}), ends {$e['date']}");
            }
        }

        if ($this->unpaid !== []) {
            $mail->line('**Unpaid invoices ('.count($this->unpaid).($overdue ? ", {$overdue} overdue" : '').')**');
            foreach ($this->unpaid as $u) {
                $mail->line("• {$u['invoice']} · {$u['client']} · {$u['amount']} · due {$u['due']}".($u['overdue'] ? ' · **OVERDUE**' : ''));
            }
        }

        if ($this->deletingSoon !== []) {
            $mail->line('**Expired accounts to be deleted in the next 7 days ('.count($this->deletingSoon).')** — renew them in Finance to keep their data');
            foreach ($this->deletingSoon as $d) {
                $mail->line("• {$d['restaurant']} — deletes {$d['date']}");
            }
        }

        if ($this->deleted !== []) {
            $mail->line('**Deleted today after 90 days offline ('.count($this->deleted).')**');
            foreach ($this->deleted as $d) {
                $mail->line("• {$d['restaurant']}");
            }
        }

        return $mail->action('Open Finance', route('admin.finance.index'));
    }
}
