<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\QrCode;
use App\Services\PlanLimits;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QrCodeController extends Controller
{
    public function index(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-qr');
        $restaurant = $current->get();

        return Inertia::render('restaurant/qr/index', [
            'branches' => Branch::query()->orderBy('id')
                ->with(['qrCodes' => fn ($q) => $q->orderByRaw('table_label is not null')->orderBy('id')])
                ->get(['id', 'name', 'slug', 'is_active']),
            'qrBaseUrl' => url('/q'),
            'menuUrl' => url($restaurant->slug),
            'qrRestaurant' => ['name' => $restaurant->name, 'logo_url' => $restaurant->logo_url, 'theme' => $restaurant->theme],
            'canUseTables' => PlanLimits::for($restaurant)->has('table_qr'),
        ]);
    }

    /** Bulk-create table QR codes: "Table 1" … "Table N", or a list of custom labels. */
    public function store(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-qr');

        if (! PlanLimits::for($current->get())->has('table_qr')) {
            $this->toast('Table QR codes are available on the Professional and Business plans.', 'error');

            return back();
        }

        $data = $request->validate([
            'branch_id' => ['required', 'integer'],
            'prefix' => ['nullable', 'string', 'max:30'],
            'from' => ['required_without:labels', 'nullable', 'integer', 'min:0', 'max:9999'],
            'to' => ['required_without:labels', 'nullable', 'integer', 'gte:from', 'max:9999'],
            'labels' => ['nullable', 'array', 'max:200'],
            'labels.*' => ['string', 'max:40'],
        ]);

        $branch = Branch::findOrFail($data['branch_id']); // tenant-scoped

        $labels = $data['labels'] ?? [];
        if (! $labels) {
            abort_if($data['to'] - $data['from'] > 199, 422, 'Create at most 200 tables at a time.');
            $prefix = trim($data['prefix'] ?? 'Table');
            foreach (range($data['from'], $data['to']) as $n) {
                $labels[] = trim($prefix.' '.str_pad((string) $n, 2, '0', STR_PAD_LEFT));
            }
        }

        $existing = $branch->qrCodes()->pluck('table_label')->filter()->map(fn ($l) => mb_strtolower($l))->all();
        $created = 0;

        DB::transaction(function () use ($labels, $existing, $branch, &$created) {
            foreach (array_unique($labels) as $label) {
                if (in_array(mb_strtolower($label), $existing, true)) {
                    continue;
                }
                QrCode::create(['branch_id' => $branch->id, 'table_label' => $label]);
                $created++;
            }
        });

        $this->toast($created ? "{$created} table QR code(s) created." : 'Those tables already have QR codes.', $created ? 'success' : 'info');

        return back();
    }

    public function update(Request $request, QrCode $qr): RedirectResponse
    {
        Gate::authorize('manage-qr');
        abort_if($qr->table_label === null, 422, 'The branch QR code has no table label.');

        $qr->update($request->validate(['table_label' => ['required', 'string', 'max:40']]));
        $this->toast('Table renamed.');

        return back();
    }

    public function destroy(QrCode $qr): RedirectResponse
    {
        Gate::authorize('manage-qr');

        if ($qr->table_label === null) {
            $this->toast('The main branch QR code can’t be deleted.', 'error');

            return back();
        }

        $qr->delete();
        $this->toast('QR code deleted. Printed copies of it will stop working.');

        return back();
    }

    /** Printable table cards (A4: 6 per page) — the browser’s “Save as PDF” makes the print-ready PDF. */
    public function print(Request $request, CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-qr');
        $restaurant = $current->get();

        $codes = QrCode::query()
            ->with('branch:id,name')
            ->when($request->query('branch'), fn ($q, $id) => $q->where('branch_id', $id))
            ->when($request->query('ids'), fn ($q, $ids) => $q->whereIn('id', array_map('intval', explode(',', $ids))))
            ->orderBy('branch_id')->orderByRaw('table_label is not null')->orderBy('id')
            ->get();

        return Inertia::render('restaurant/qr/print', [
            'codes' => $codes->map(fn ($c) => ['id' => $c->id, 'code' => $c->code, 'table' => $c->table_label, 'branch' => $c->branch?->name]),
            'qrBaseUrl' => url('/q'),
            'qrRestaurant' => ['name' => $restaurant->name, 'logo_url' => $restaurant->logo_url, 'languages' => $restaurant->languages],
        ]);
    }
}
