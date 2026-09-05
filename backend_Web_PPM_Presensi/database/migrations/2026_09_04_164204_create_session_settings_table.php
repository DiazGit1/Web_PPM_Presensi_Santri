<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('session_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('session_type', ['subuh', 'malam'])->unique();
            $table->string('label');
            $table->time('scan_start_time');
            $table->time('on_time_until');
            $table->time('end_time');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_settings');
    }
};
