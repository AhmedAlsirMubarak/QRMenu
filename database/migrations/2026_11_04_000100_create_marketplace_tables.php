<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            // The restaurant chooses to appear on the public Marketplace (Profile › Marketplace).
            $table->boolean('marketplace_listed')->default(false)->after('showcase_order');
            $table->string('venue_type', 20)->default('restaurant')->after('marketplace_listed'); // restaurant|cafe|bakery|dessert|juice|lounge
            $table->json('cuisines')->nullable()->after('venue_type');
        });

        Schema::create('ad_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('advertiser_type', 20)->default('restaurant'); // restaurant | external
            $table->foreignId('restaurant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('advertiser_name')->nullable();                // external companies
            $table->string('slot', 20);                                   // banner | sponsored | sidebar | offer
            $table->json('title');
            $table->json('subtitle')->nullable();
            $table->string('image_path')->nullable();
            $table->string('link_url')->nullable();                       // external ads; restaurant ads link to their menu
            $table->string('city')->nullable();                           // null = everywhere
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->decimal('price', 10, 3)->default(0);
            $table->string('currency', 3)->default('OMR');
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_paused')->default(false);
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['slot', 'starts_at', 'ends_at']);
        });

        Schema::create('upgrade_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subscription_plan_id')->constrained();
            $table->string('billing_cycle', 10)->default('monthly');
            $table->text('message')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upgrade_requests');
        Schema::dropIfExists('ad_campaigns');
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['marketplace_listed', 'venue_type', 'cuisines']);
        });
    }
};
