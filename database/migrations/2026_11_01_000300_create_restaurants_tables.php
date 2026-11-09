<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();           // menu.domain.com/{slug}
            $table->json('tagline')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('main_language', 8)->default('en');
            $table->json('languages');                   // ["en","ar"] incl. main
            $table->string('currency', 3)->default('OMR');
            $table->string('theme')->default('saffron');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('instagram_handle')->nullable();
            $table->string('google_review_url')->nullable();
            $table->decimal('google_rating', 2, 1)->nullable();      // manual for MVP
            $table->unsignedInteger('google_review_count')->nullable();
            $table->json('settings')->nullable();        // plate story, feedback alerts...
            $table->string('status')->default('active'); // active | suspended
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('restaurant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');                      // owner | manager | editor
            $table->timestamps();
            $table->unique(['restaurant_id', 'user_id']);
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('city')->nullable();
            $table->string('area')->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone')->nullable();
            $table->string('wifi_name')->nullable();
            $table->string('wifi_password')->nullable();
            $table->json('opening_hours')->nullable();
            $table->string('google_review_url')->nullable(); // overrides restaurant's
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['restaurant_id', 'slug']);
            $table->index('restaurant_id');
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->constrained();
            $table->string('billing_cycle')->default('monthly'); // monthly | yearly
            $table->decimal('price', 10, 3);
            $table->string('currency', 3)->default('OMR');
            $table->string('status')->default('trialing'); // trialing|active|past_due|cancelled|expired
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['restaurant_id', 'status']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('type')->default('subscription'); // subscription | advertising | other
            $table->string('payer_name')->nullable();        // external advertisers
            $table->string('description')->nullable();
            $table->decimal('amount', 10, 3);
            $table->string('currency', 3)->default('OMR');
            $table->string('method')->nullable();            // card | bank_transfer | cash
            $table->string('status')->default('pending');    // pending|paid|overdue|failed|refunded
            $table->date('due_date')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('reference')->nullable();         // gateway / bank ref
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('restaurant_user');
        Schema::dropIfExists('restaurants');
    }
};
