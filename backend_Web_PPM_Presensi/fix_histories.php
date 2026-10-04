<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$inactiveStudents = \App\Models\Student::where('active', 0)->get();
$fixedCount = 0;

foreach ($inactiveStudents as $student) {
    $openHistories = \App\Models\StudentClassHistory::where('student_id', $student->id)
        ->whereNull('effective_to')
        ->get();
        
    foreach ($openHistories as $h) {
        $dateToClose = $student->updated_at ? $student->updated_at->toDateString() : now()->toDateString();
        // ensure effective_to >= effective_from
        if ($dateToClose < $h->effective_from) {
            $dateToClose = $h->effective_from;
        }
        $h->effective_to = $dateToClose;
        $h->save();
        $fixedCount++;
        echo "Fixed history for student: {$student->name} (Closed at {$dateToClose})\n";
    }
}

echo "Fixed $fixedCount open histories for inactive students.\n";
