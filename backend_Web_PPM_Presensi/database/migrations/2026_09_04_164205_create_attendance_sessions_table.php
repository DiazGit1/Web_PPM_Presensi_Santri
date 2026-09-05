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
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('session_date');
            $table->enum('session_type', ['subuh', 'malam']);
            $table->time('scan_start_time');
            $table->time('on_time_until');
            $table->time('end_time');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();
            $table->unique(['session_date', 'session_type']);
            $table->index('session_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
