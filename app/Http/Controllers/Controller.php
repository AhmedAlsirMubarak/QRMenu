<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

abstract class Controller
{
    /** Show a toast on the next page (rendered by useFlashToast on the frontend). */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }
}
