<?php

namespace App\Observers;

use App\Models\VehicleBrand;
use App\Models\Appointment;
use App\Models\Ticket;

class VehicleBrandObserver
{
    /**
     * Handle the VehicleBrand "updated" event.
     */
    public function updated(VehicleBrand $brand): void
    {
        // Sync snapshot on Appointments
        Appointment::where('vehicle_brand_id', $brand->id)
            ->update(['vehicle_brand' => $brand->name]);
        // Sync snapshot on Tickets
        Ticket::where('vehicle_brand_id', $brand->id)
            ->update(['vehicle_brand' => $brand->name]);
    }
}
