<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Simulate the dashboard logic
$controller = new \App\Http\Controllers\Api\DashboardController();
$req = \Illuminate\Http\Request::create('/api/dashboard/stats', 'GET');
try {
    $res = $controller->stats($req);
    echo "SUCCESS\n";
    echo $res->getContent();
} catch (\Exception $e) {
    echo "ERROR\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString();
} catch (\Throwable $e) {
    echo "FATAL ERROR\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
