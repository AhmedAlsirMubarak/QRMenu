<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Platform brand & defaults (brand name is editable here, used across website and dashboards). */
class SettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => SiteSetting::allValues(),
            'currencies' => array_keys(config('qrmenu.currencies')),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'brand_name' => ['required', 'string', 'max:40'],
            'support_email' => ['nullable', 'email'],
            'default_currency' => ['required', Rule::in(array_keys(config('qrmenu.currencies')))],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'brand_logo' => ['nullable', 'image', 'max:2048'],
            'notify_plan_expiry' => ['boolean'],
            'notify_invoices' => ['boolean'],
            'notify_admin_digest' => ['boolean'],
            'notify_winback' => ['boolean'],
            'auto_delete_expired' => ['boolean'],
        ]);
        foreach (['notify_plan_expiry', 'notify_invoices', 'notify_admin_digest', 'notify_winback', 'auto_delete_expired'] as $flag) {
            $data[$flag] = $request->boolean($flag);
        }

        if ($request->hasFile('brand_logo')) {
            $data['brand_logo'] = '/storage/'.$request->file('brand_logo')->store('brand', 'public');
        } else {
            unset($data['brand_logo']);
        }

        foreach ($data as $key => $value) {
            SiteSetting::put($key, $value);
        }

        $this->toast('Settings saved.', 'success');

        return back();
    }
}
