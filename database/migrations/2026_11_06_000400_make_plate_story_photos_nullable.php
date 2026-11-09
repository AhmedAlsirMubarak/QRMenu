<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plate_stories', function (Blueprint $table) {
            // Photos of hidden / never-approved / older stories are cleaned up; the row stays for statistics.
            $table->string('before_path')->nullable()->change();
            $table->timestamp('photos_deleted_at')->nullable()->after('card_path');
        });
    }

    public function down(): void
    {
        Schema::table('plate_stories', function (Blueprint $table) {
            $table->dropColumn('photos_deleted_at');
        });
    }
};
