<?php

namespace App\Actions\Restaurants;

use App\Models\AdCampaign;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\User;
use App\Services\ImageStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Permanently erases a restaurant: menu, photos, branches, QR codes, feedback, Plate Stories, stats and its ads.
 * Invoices stay in Finance (they keep the restaurant's name as the payer). User accounts are kept.
 */
class DeleteRestaurant
{
    public function handle(Restaurant $restaurant): void
    {
        DB::transaction(function () use ($restaurant) {
            // Keep the client's name on its invoices once the restaurant row is gone.
            Payment::where('restaurant_id', $restaurant->id)->whereNull('payer_name')->update(['payer_name' => $restaurant->name]);

            AdCampaign::withTrashed()->where('restaurant_id', $restaurant->id)->get()->each(function (AdCampaign $ad) {
                ImageStore::delete($ad->image_path);
                $ad->forceDelete();
            });

            User::where('current_restaurant_id', $restaurant->id)->update(['current_restaurant_id' => null]);

            $restaurant->forceDelete(); // related rows are removed by the database's cascading foreign keys
        });

        Storage::disk('public')->deleteDirectory("restaurants/{$restaurant->id}");
    }
}
