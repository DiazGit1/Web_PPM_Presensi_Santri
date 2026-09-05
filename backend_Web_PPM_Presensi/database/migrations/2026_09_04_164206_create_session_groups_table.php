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
        Schema::create('session_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignUuid('group_id')->constrained('groups')->restrictOnDelete();
            $table->boolean('opened')->default(true);
            $table->boolean('closed_manually')->default(false);
            $table->boolean('finalized')->default(false);
            $table->timestamp('finalized_at')->nullable();
            $table->timestamps();
            $table->unique(['session_id', 'group_id']);
            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_groups');
    }
};
