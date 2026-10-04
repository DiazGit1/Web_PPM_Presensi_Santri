<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = \App\Models\AttendanceRecord::whereDate('created_at', today())->where('source', 'auto_alpa')->delete();
echo "Deleted " . $count . " auto_alpa records created today.\n";
