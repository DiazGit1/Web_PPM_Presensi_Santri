<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$inactiveStudents = \App\Models\Student::where('active', 0)->get();
$fixedCount = 0;

foreach ($inactiveStudents as $student) {
    $histories = \App\Models\StudentClassHistory::where('student_id', $student->id)->get();
    foreach ($histories as $h) {
        if ($h->effective_to) {
            $newDate = \Carbon\Carbon::parse($h->effective_to)->subDay()->toDateString();
            
            // To completely invalidate the history if it was just 1 day active, we allow effective_to < effective_from.
            $h->effective_to = $newDate;
            $h->save();
            $fixedCount++;
            echo "Adjusted history for student: {$student->name} (Closed at {$newDate})\n";
        }
    }
}

echo "Adjusted $fixedCount histories for inactive students.\n";
