<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

/** Writes an audit row when a signed-in user creates, changes or deletes the model. */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        foreach (['created', 'updated', 'deleted'] as $event) {
            static::$event(function ($model) use ($event) {
                if (! Auth::check()) {
                    return;
                }

                $changes = $event === 'updated'
                    ? collect($model->getChanges())->except(['updated_at'])->all()
                    : null;

                if ($event === 'updated' && empty($changes)) {
                    return;
                }

                ActivityLog::create([
                    'restaurant_id' => $model->restaurant_id ?? null,
                    'user_id' => Auth::id(),
                    'action' => $event,
                    'subject_type' => class_basename($model),
                    'subject_id' => $model->getKey(),
                    'changes' => $changes,
                ]);
            });
        }
    }
}
