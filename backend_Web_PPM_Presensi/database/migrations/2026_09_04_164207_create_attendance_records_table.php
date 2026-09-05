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
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->restrictOnDelete();
            $table->foreignUuid('group_id')->constrained('groups')->restrictOnDelete();
            $table->enum('status', ['hadir', 'terlambat', 'izin', 'sakit', 'alpa']);
            $table->timestamp('scanned_at')->nullable();
            $table->enum('source', ['scan', 'manual_nis', 'auto_alpa', 'edited'])->default('scan');
            $table->foreignUuid('operator_id')->nullable()->constrained('attendance_operators')->nullOnDelete();
            $table->foreignUuid('class_id_snapshot')->constrained('classes');
            $table->string('group_name_snapshot');
            $table->enum('gender_snapshot', ['L', 'P']);
            $table->timestamps();
            $table->unique(['session_id', 'student_id']);
            $table->index('session_id');
            $table->index('student_id');
            $table->index('group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
