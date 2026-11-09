<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('import_batches', function (Blueprint $table) {
            $table->string('path')->nullable()->after('filename');   // private disk
            $table->string('extension', 8)->nullable()->after('path');
            $table->json('headers')->nullable()->after('column_map');
            $table->json('summary')->nullable()->after('errors');   // counts + preview rows
            $table->timestamp('completed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('import_batches', function (Blueprint $table) {
            $table->dropColumn(['path', 'extension', 'headers', 'summary', 'completed_at']);
        });
    }
};
