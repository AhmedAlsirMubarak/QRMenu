<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Inbox for the website's contact form. */
class ContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        $messages = ContactMessage::query()
            ->with('handler:id,name')
            ->when($status === '' , fn ($q) => $q->where('status', '!=', 'archived'))
            ->when(in_array($status, ContactMessage::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->when(array_key_exists((string) $request->query('topic'), ContactMessage::TOPICS), fn ($q) => $q->where('topic', $request->query('topic')))
            ->when($request->string('search')->toString(), fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
                ->orWhere('company', 'like', "%{$s}%")->orWhere('message', 'like', "%{$s}%")))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        $counts = ContactMessage::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('admin/messages/index', [
            'messages' => $messages,
            'filters' => $request->only('status', 'topic', 'search'),
            'topics' => ContactMessage::TOPICS,
            'counts' => [
                'new' => (int) ($counts['new'] ?? 0),
                'read' => (int) ($counts['read'] ?? 0),
                'replied' => (int) ($counts['replied'] ?? 0),
                'archived' => (int) ($counts['archived'] ?? 0),
            ],
            'openId' => $request->integer('open') ?: null,
        ]);
    }

    public function update(Request $request, ContactMessage $message): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(ContactMessage::STATUSES)],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        if (isset($data['status']) && in_array($data['status'], ['replied', 'archived'], true) && ! $message->handled_at) {
            $data += ['handled_by' => $request->user()->id, 'handled_at' => now()];
        }

        $message->update($data);

        if (array_key_exists('admin_notes', $data)) {
            $this->toast('Note saved.');
        }

        return back();
    }

    public function destroy(ContactMessage $message): RedirectResponse
    {
        $message->delete();
        $this->toast('Message deleted.');

        return back();
    }
}
