<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('code')->unique();          // short permanent id in the URL
            $table->string('table_label')->nullable(); // "Table 01"; null = branch QR
            $table->unsignedBigInteger('scans_count')->default(0);
            $table->timestamps();
            $table->index(['restaurant_id', 'branch_id']);
        });

        Schema::create('customer_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('qr_code_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('food_rating')->nullable();
            $table->unsignedTinyInteger('service_rating')->nullable();
            $table->unsignedTinyInteger('cleanliness_rating')->nullable();
            $table->unsignedTinyInteger('overall_rating')->nullable();
            $table->text('comment')->nullable();
            $table->boolean('is_anonymous')->default(true);
            $table->string('contact')->nullable();
            $table->string('locale', 8)->nullable();
            $table->timestamp('alert_sent_at')->nullable();   // low-rating email alert
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['restaurant_id', 'branch_id', 'created_at']);
        });

        // Raw analytics events (scan, menu_view, category_view, item_view, plate_story_share...)
        Schema::create('menu_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('qr_code_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event', 40);
            $table->string('subject_type', 40)->nullable(); // category | item
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('session_hash', 64);             // hashed, no personal data
            $table->string('locale', 8)->nullable();
            $table->string('source', 20)->nullable();       // qr | link | marketplace | story
            $table->timestamp('created_at')->useCurrent();
            $table->index(['restaurant_id', 'event', 'created_at']);
            $table->index(['restaurant_id', 'subject_type', 'subject_id']);
        });

        Schema::create('plate_stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('menu_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('before_path');
            $table->string('after_path')->nullable();
            $table->string('card_path')->nullable();     // generated story image
            $table->string('card_style')->default('dark');
            $table->string('status')->default('pending'); // pending | approved | hidden
            $table->timestamp('shared_at')->nullable();
            $table->string('reward_code')->nullable()->unique();
            $table->timestamp('reward_expires_at')->nullable();
            $table->timestamp('reward_redeemed_at')->nullable();
            $table->string('session_hash', 64)->nullable();
            $table->timestamps();
            $table->index(['restaurant_id', 'status']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');                  // created | updated | deleted | imported
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['restaurant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('plate_stories');
        Schema::dropIfExists('menu_events');
        Schema::dropIfExists('customer_feedback');
        Schema::dropIfExists('qr_codes');
    }
};
