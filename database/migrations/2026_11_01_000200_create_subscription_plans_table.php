<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->json('name');                       // {"en": "Starter", "ar": "..."}
            $table->string('slug')->unique();
            $table->json('description')->nullable();
            $table->decimal('price_monthly', 10, 3);    // OMR uses 3 decimals
            $table->decimal('price_yearly', 10, 3)->nullable();
            $table->string('currency', 3)->default('OMR');
            $table->unsignedInteger('max_branches')->nullable();   // null = unlimited
            $table->unsignedInteger('max_languages')->nullable();
            $table->unsignedInteger('max_items')->nullable();
            $table->json('features')->nullable();       // ["table_qr","csv_import",...]
            $table->unsignedInteger('trial_days')->default(14);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);   // shown on website pricing
            $table->boolean('is_featured')->default(false); // "Most popular"
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
