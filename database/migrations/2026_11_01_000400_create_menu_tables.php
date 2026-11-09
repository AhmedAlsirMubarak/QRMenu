<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->json('name');                    // {"en": "...", "ar": "..."}
            $table->json('description')->nullable();
            $table->string('image_path')->nullable();
            $table->time('available_from')->nullable(); // time-based menus
            $table->time('available_until')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['restaurant_id', 'sort_order']);
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_category_id')->constrained()->cascadeOnDelete();
            $table->string('sku')->nullable();        // used by CSV "update" mode
            $table->json('name');
            $table->json('description')->nullable();
            $table->decimal('price', 10, 3);
            $table->decimal('compare_at_price', 10, 3)->nullable(); // old price
            $table->string('image_path')->nullable();
            $table->boolean('is_available')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->json('dietary_tags')->nullable();  // ["vegetarian","vegan","spicy"]
            $table->json('allergens')->nullable();     // ["gluten","dairy"]
            $table->unsignedInteger('calories')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['restaurant_id', 'sku']);
            $table->index(['restaurant_id', 'menu_category_id', 'sort_order']);
        });

        Schema::create('menu_item_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->string('type')->default('size');   // size | extra
            $table->json('name');
            $table->decimal('price', 10, 3)->default(0); // size = full price, extra = add-on price
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Per-branch overrides (e.g. sold out only at one branch)
        Schema::create('branch_menu_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_available')->default(true);
            $table->decimal('price', 10, 3)->nullable();
            $table->unique(['branch_id', 'menu_item_id']);
        });

        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('filename');
            $table->string('mode');                    // add | update | upsert
            $table->string('status')->default('pending'); // pending|previewed|completed|failed
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->json('column_map')->nullable();
            $table->json('errors')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');
        Schema::dropIfExists('branch_menu_item');
        Schema::dropIfExists('menu_item_options');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menu_categories');
    }
};
