<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per reminder sent, so the daily job never emails the same reminder twice.
        Schema::create('sent_reminders', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // e.g. plan:12:2026-12-01:7d · invoice:44:due
            $table->timestamp('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_reminders');
    }
};
