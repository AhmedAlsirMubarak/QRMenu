<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\SiteSetting;
use App\Notifications\ContactMessageReceived;
use App\Services\Website\WebsiteContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('website/contact', [
            'page' => WebsiteContent::page('contact'),
            'chrome' => WebsiteContent::chrome(),
            'topics' => array_keys(ContactMessage::TOPICS),
            'topic' => array_key_exists((string) $request->query('topic'), ContactMessage::TOPICS) ? $request->query('topic') : 'general',
            'contactEmail' => SiteSetting::get('support_email'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'topic' => ['required', Rule::in(array_keys(ContactMessage::TOPICS))],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'company' => ['nullable', 'string', 'max:160'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'locale' => ['nullable', 'string', 'max:8'],
            'website' => ['prohibited'], // honeypot field, hidden from people
        ]);

        $contact = ContactMessage::create(collect($data)->except('website')->map(fn ($v) => is_string($v) ? strip_tags(trim($v)) : $v)->all() + [
            'ip_hash' => hash('sha256', $request->ip().'|'.config('app.key')),
        ]);

        if ($to = SiteSetting::get('support_email')) {
            try {
                Notification::route('mail', $to)->notify(new ContactMessageReceived($contact));
            } catch (\Throwable $e) {
                // The message is saved either way; a mail problem must not lose it or show an error to the visitor.
                Log::warning('Contact notification email failed', ['message' => $contact->id, 'error' => $e->getMessage()]);
            }
        }

        return back(); // the form shows its own thank-you message on success
    }
}
