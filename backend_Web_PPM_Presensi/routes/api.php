<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\AttendanceController;

Route::post('/login', [AuthController::class, 'login']);

Route::get('/attendance/scanner-state', [AttendanceController::class, 'getScannerState']);
Route::post('/attendance/validate-operator', [AttendanceController::class, 'validateOperator']);
Route::post('/attendance/record', [AttendanceController::class, 'record']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('students', StudentController::class);
    Route::post('students/import', [StudentController::class, 'import']);
    Route::apiResource('sessions', SessionController::class);
    Route::post('sessions/{sessionId}/groups/{groupId}/toggle', [SessionController::class, 'toggleGroup']);
    
    Route::apiResource('operators', \App\Http\Controllers\Api\OperatorController::class)->only(['index', 'store', 'update', 'destroy']);
    
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance/edit-status', [AttendanceController::class, 'editStatus']);

    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\DashboardController::class, 'stats']);

    Route::get('/recap/summary', [\App\Http\Controllers\Api\RecapController::class, 'getRecapSummary']);
    Route::get('/recap/export', [\App\Http\Controllers\Api\RecapController::class, 'export']);
    Route::get('/recap/matrix', [\App\Http\Controllers\Api\RecapController::class, 'getMatrix']);
    
    Route::get('/reference', [\App\Http\Controllers\Api\ReferenceController::class, 'index']);
    Route::put('/reference/settings', [\App\Http\Controllers\Api\ReferenceController::class, 'updateSettings']);
});
