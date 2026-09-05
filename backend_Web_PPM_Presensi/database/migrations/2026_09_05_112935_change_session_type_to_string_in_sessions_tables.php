<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE attendance_sessions MODIFY session_type VARCHAR(255)");
        DB::statement("ALTER TABLE session_settings MODIFY session_type VARCHAR(255)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sessions_tables', function (Blueprint $table) {
            //
        });
    }
};
