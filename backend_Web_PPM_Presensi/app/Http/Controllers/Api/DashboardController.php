<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $today = Carbon::today();
        
        // Find active session for today
        $activeSession = AttendanceSession::whereDate('session_date', $today)
            ->where('status', 'open')
            ->first();
            
        $activeSessionLabel = null;
        if ($activeSession) {
            $activeSessionLabel = $activeSession->session_type === 'subuh' ? 'Sesi Subuh' : 'Sesi Malam';
            // Assuming session_date is cast to Carbon in model, otherwise parse it
            $parsedDate = \Carbon\Carbon::parse($activeSession->session_date);
            $activeSessionLabel .= ', ' . $parsedDate->translatedFormat('d F Y');
        }

        // Calculate stats for today
        $stats = [
            'hadir' => AttendanceRecord::whereDate('created_at', $today)->where('status', 'hadir')->count(),
            'terlambat' => AttendanceRecord::whereDate('created_at', $today)->where('status', 'terlambat')->count(),
            'izin' => AttendanceRecord::whereDate('created_at', $today)->where('status', 'izin')->count(),
            'sakit' => AttendanceRecord::whereDate('created_at', $today)->where('status', 'sakit')->count(),
            'alpa' => AttendanceRecord::whereDate('created_at', $today)->where('status', 'alpa')->count(),
        ];

        return response()->json([
            'ok' => true,
            'activeSessionLabel' => $activeSessionLabel,
            'stats' => $stats
        ]);
    }
}
