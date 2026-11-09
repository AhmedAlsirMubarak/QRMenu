<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\ImportBatch;
use App\Models\MenuItem;
use App\Services\MenuImport\ColumnMapper;
use App\Services\MenuImport\MenuExporter;
use App\Services\MenuImport\MenuImporter;
use App\Services\MenuImport\RowAnalyzer;
use App\Services\PlanLimits;
use App\Services\Spreadsheet\SpreadsheetWriter;
use App\Support\CurrentRestaurant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ImportController extends Controller
{
    public function index(CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-menu');

        return Inertia::render('restaurant/import/index', [
            'batches' => ImportBatch::query()->with('user:id,name')->latest()->limit(20)
                ->get(['id', 'user_id', 'filename', 'mode', 'status', 'total_rows', 'created_count', 'updated_count', 'failed_count', 'created_at', 'completed_at']),
            'canImport' => PlanLimits::for($current->get())->has('csv_import'),
            'itemCount' => MenuItem::count(),
        ]);
    }

    public function store(Request $request, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $this->ensureFeature($current);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:5120', 'extensions:csv,txt,xlsx'],
            'mode' => ['required', Rule::in(RowAnalyzer::MODES)],
        ], ['file.extensions' => 'Please upload a .csv or .xlsx file.']);

        try {
            $batch = (new MenuImporter($current->get()))->upload($data['file'], $request->user()->id, $data['mode']);
        } catch (RuntimeException $e) {
            return back()->withErrors(['file' => $e->getMessage()]);
        }

        return redirect()->route('restaurant.import.show', $batch);
    }

    public function show(ImportBatch $batch, CurrentRestaurant $current): Response
    {
        Gate::authorize('manage-menu');
        $restaurant = $current->get();
        $languageNames = collect(config('qrmenu.languages'))->map(fn ($l) => $l['name'])->all();

        return Inertia::render('restaurant/import/show', [
            'batch' => $batch->only(['id', 'filename', 'mode', 'status', 'total_rows', 'created_count', 'updated_count', 'failed_count', 'column_map', 'headers', 'summary', 'errors', 'completed_at']),
            'fields' => ColumnMapper::fields($restaurant->languages, $languageNames),
            'required' => ['category.'.$restaurant->main_language, 'name.'.$restaurant->main_language, 'price'],
            'sampleRows' => $this->sampleRows($batch, $current),
        ]);
    }

    public function preview(Request $request, ImportBatch $batch, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $this->ensureFeature($current);
        abort_if($batch->status === 'completed', 409, 'This import has already been run.');

        $fields = array_keys(ColumnMapper::fields($current->get()->languages));
        $data = $request->validate([
            'mode' => ['required', Rule::in(RowAnalyzer::MODES)],
            'map' => ['nullable', 'array'],
        ]);

        // Field keys contain dots ("name.en"), so read the raw array rather than validated nested data.
        $columns = count($batch->headers ?? []);
        $map = collect($request->input('map', []))
            ->filter(fn ($v, $k) => in_array($k, $fields, true) && is_numeric($v) && (int) $v >= 0 && (int) $v < $columns)
            ->map(fn ($v) => (int) $v)
            ->all();

        try {
            (new MenuImporter($current->get()))->preview($batch, $map, $data['mode']);
        } catch (RuntimeException $e) {
            return back()->withErrors(['map' => $e->getMessage()]);
        }

        return back();
    }

    public function run(ImportBatch $batch, CurrentRestaurant $current): RedirectResponse
    {
        Gate::authorize('manage-menu');
        $this->ensureFeature($current);
        abort_unless($batch->status === 'previewed', 409, 'Preview the import before running it.');

        try {
            $batch = (new MenuImporter($current->get()))->run($batch);
        } catch (RuntimeException $e) {
            return back()->withErrors(['map' => $e->getMessage()]);
        }

        $this->toast("Import finished: {$batch->created_count} added, {$batch->updated_count} updated".($batch->failed_count ? ", {$batch->failed_count} skipped." : '.'));

        return back();
    }

    public function errors(ImportBatch $batch, CurrentRestaurant $current): BinaryFileResponse
    {
        Gate::authorize('manage-menu');
        $rows = (new MenuImporter($current->get()))->errorReport($batch);

        return $this->download($rows, 'csv', 'import-errors-'.$batch->id);
    }

    public function template(Request $request, CurrentRestaurant $current): BinaryFileResponse
    {
        Gate::authorize('manage-menu');
        $format = $request->query('format') === 'csv' ? 'csv' : 'xlsx';

        return $this->download((new MenuExporter($current->get()))->template(), $format, 'menu-template');
    }

    public function export(Request $request, CurrentRestaurant $current): BinaryFileResponse
    {
        Gate::authorize('manage-menu');
        $format = $request->query('format') === 'csv' ? 'csv' : 'xlsx';
        $restaurant = $current->get();

        return $this->download((new MenuExporter($restaurant))->rows(), $format, Str::slug($restaurant->name).'-menu-'.now()->format('Y-m-d'));
    }

    protected function download(array $rows, string $format, string $name): BinaryFileResponse
    {
        $path = tempnam(sys_get_temp_dir(), 'qrm').'.'.$format;
        SpreadsheetWriter::write($path, $rows, $format);

        return response()->download($path, "{$name}.{$format}", [
            'Content-Type' => $format === 'csv' ? 'text/csv; charset=UTF-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend();
    }

    protected function sampleRows(ImportBatch $batch, CurrentRestaurant $current): array
    {
        try {
            [, $rows] = (new MenuImporter($current->get()))->readFile($batch);

            return array_values(array_slice($rows, 0, 3));
        } catch (RuntimeException) {
            return [];
        }
    }

    protected function ensureFeature(CurrentRestaurant $current): void
    {
        abort_unless(PlanLimits::for($current->get())->has('csv_import'), 403, 'Excel/CSV import is available on the Professional and Business plans.');
    }
}
