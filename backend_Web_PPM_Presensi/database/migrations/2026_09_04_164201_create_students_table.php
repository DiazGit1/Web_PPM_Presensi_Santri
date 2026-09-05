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
        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nis')->unique();
            $table->string('name');
            $table->foreignUuid('class_id')->constrained('classes')->restrictOnDelete();
            $table->enum('gender', ['L', 'P']);
            $table->string('generation')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->index('class_id');
            $table->index('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
