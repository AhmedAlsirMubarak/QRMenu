<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-channel alert tracking was only needed for WhatsApp alerts, which were removed (alerts are email-only).
 * Kept as a clean-up so databases that briefly had the column end up the same as new ones.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('customer_feedback', 'alert_channels')) {
            Schema::table('customer_feedback', fn (Blueprint $table) => $table->dropColumn('alert_channels'));
        }
    }

    public function down(): void {}
};
