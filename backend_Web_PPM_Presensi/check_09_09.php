<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$h = \App\Models\StudentClassHistory::where('effective_to', '2026-09-09')->get();
foreach($h as $x) {
    echo "Student ID: " . $x->student_id . " From: " . $x->effective_from . " To: " . $x->effective_to . "\n";
}
