<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // When the menu went offline (status became "expired"). Drives the win-back email and data clean-up.
            $table->timestamp('expired_at')->nullable()->after('cancelled_at');
        });

        // Accounts that are already expired start their clean-up clock today, so nobody loses data without warnings.
        DB::table('subscriptions')->where('status', 'expired')->update(['expired_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('expired_at');
        });
    }
};
