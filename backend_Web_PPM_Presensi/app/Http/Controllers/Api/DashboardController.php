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
        
        // Find latest session
        $latestSession = \Illuminate\Support\Facades\DB::table('attendance_sessions')
            ->orderBy('session_date', 'desc')
            ->orderBy('scan_start_time', 'desc')
            ->first();
            
        $activeSessionLabel = null;
        if ($latestSession) {
            $activeSessionLabel = 'Sesi Terakhir: ' . ucfirst($latestSession->session_type);
            $parsedDate = Carbon::parse($latestSession->session_date);
            $activeSessionLabel .= ', ' . $parsedDate->translatedFormat('d F Y');
        }

        $stats = [
            'hadir' => 0,
            'terlambat' => 0,
            'izin' => 0,
            'sakit' => 0,
            'alpa' => 0,
        ];
        $statsByClass = [];

        // To match Detail Presensi, get the latest session's exact numbers
        $latestSession = \Illuminate\Support\Facades\DB::table('attendance_sessions')
            ->orderBy('session_date', 'desc')
            ->orderBy('scan_start_time', 'desc')
            ->first();

        if ($latestSession) {
            $records = \Illuminate\Support\Facades\DB::table('attendance_records')
                ->where('session_id', $latestSession->id)
                ->get()
                ->keyBy('student_id');
                
            $sessionGroups = \Illuminate\Support\Facades\DB::table('session_groups')
                ->where('session_id', $latestSession->id)
                ->get();
                
            $students = \App\Models\Student::with('schoolClass')->where('active', true)->get();
            $groups = \App\Models\Group::all();
            
            $groupMap = [];
            foreach ($groups as $g) {
                $groupMap[$g->class_id . '_' . $g->gender] = $g->id;
            }

            $sgMap = [];
            foreach ($sessionGroups as $sg) {
                $sgMap[$sg->group_id] = $sg;
            }

            foreach ($students as $student) {
                $sGroupId = $groupMap[$student->class_id . '_' . $student->gender] ?? null;
                $sg = $sgMap[$sGroupId] ?? null;
                if ($sg) {
                    $className = $student->schoolClass ? $student->schoolClass->name : 'Tanpa Kelas';
                    if (!isset($statsByClass[$className])) {
                        $statsByClass[$className] = ['hadir' => 0, 'terlambat' => 0, 'izin' => 0, 'sakit' => 0, 'alpa' => 0];
                    }

                    $record = $records->get($student->id);
                    if ($record) {
                        if (isset($stats[$record->status])) {
                            $stats[$record->status]++;
                            $statsByClass[$className][$record->status]++;
                        }
                    } else {
                        $stats['alpa']++;
                        $statsByClass[$className]['alpa']++;
                    }
                }
            }
        }

        $classOrder = [
            'Bacaan' => 1,
            'Lambatan' => 2,
            'Cepatan' => 3,
            'HB' => 4
        ];
        
        uksort($statsByClass, function($a, $b) use ($classOrder) {
            $orderA = $classOrder[$a] ?? 99;
            $orderB = $classOrder[$b] ?? 99;
            if ($orderA !== $orderB) {
                return $orderA - $orderB;
            }
            return strcmp($a, $b);
        });

        return response()->json([
            'ok' => true,
            'activeSessionLabel' => $activeSessionLabel,
            'stats' => $stats,
            'statsByClass' => $statsByClass
        ]);
    }
}
