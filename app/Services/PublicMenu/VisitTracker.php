<?php

namespace App\Services\PublicMenu;

use App\Models\MenuEvent;
use App\Models\QrCode;
use App\Models\Restaurant;
use Illuminate\Http\Request;

/**
 * Privacy-friendly analytics for guest menus: no accounts, no personal data.
 * A visitor is identified by a daily hash of their session id; bots and link previews are ignored.
 */
class VisitTracker
{
    protected const BOT_PATTERN = '/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|curl|wget|python|httpclient|headless|lighthouse|pingdom|uptime|monitor/i';

    public const EVENTS = ['scan', 'menu_view', 'category_view', 'item_view', 'search', 'review_click', 'language_switch', 'plate_story_share'];

    public static function isBot(Request $request): bool
    {
        $agent = (string) $request->userAgent();

        return $agent === '' || preg_match(self::BOT_PATTERN, $agent) === 1;
    }

    public static function sessionHash(Request $request): string
    {
        $id = $request->hasSession() ? $request->session()->getId() : $request->ip().'|'.$request->userAgent();

        return hash('sha256', $id.'|'.now()->toDateString().'|'.config('app.key'));
    }

    public static function record(Request $request, Restaurant $restaurant, string $event, array $extra = []): void
    {
        if (self::isBot($request) || ! in_array($event, self::EVENTS, true)) {
            return;
        }

        // Staff previewing their own menu shouldn't count.
        if ($request->user() && $request->user()->restaurants()->whereKey($restaurant->id)->exists()) {
            return;
        }

        MenuEvent::create([
            'restaurant_id' => $restaurant->id,
            'branch_id' => $extra['branch_id'] ?? null,
            'qr_code_id' => $extra['qr_code_id'] ?? null,
            'event' => $event,
            'subject_type' => $extra['subject_type'] ?? null,
            'subject_id' => $extra['subject_id'] ?? null,
            'session_hash' => self::sessionHash($request),
            'locale' => $extra['locale'] ?? null,
            'source' => $extra['source'] ?? null,
        ]);
    }

    public static function recordScan(Request $request, QrCode $qr): void
    {
        if (self::isBot($request)) {
            return;
        }

        $qr->increment('scans_count');
        self::record($request, $qr->restaurant, 'scan', ['branch_id' => $qr->branch_id, 'qr_code_id' => $qr->id, 'source' => 'qr']);
    }
}
