<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Student;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecapController extends Controller
{
    public function getRecapSummary(Request $request)
    {
        $startDate = $request->query('from');
        $endDate = $request->query('to');
        $groupId = $request->query('groupId');

        $query = DB::table('attendance_records')
            ->join('attendance_sessions', 'attendance_records.session_id', '=', 'attendance_sessions.id')
            ->join('students', 'attendance_records.student_id', '=', 'students.id')
            ->leftJoin('school_classes', 'students.class_id', '=', 'school_classes.id')
            ->select(
                'students.id as student_id',
                'students.name',
                'students.nis',
                'students.gender',
                'school_classes.name as class_name',
                DB::raw("COUNT(CASE WHEN attendance_records.status = 'hadir' THEN 1 END) as total_hadir"),
                DB::raw("COUNT(CASE WHEN attendance_records.status = 'terlambat' THEN 1 END) as total_terlambat"),
                DB::raw("COUNT(CASE WHEN attendance_records.status = 'izin' THEN 1 END) as total_izin"),
                DB::raw("COUNT(CASE WHEN attendance_records.status = 'sakit' THEN 1 END) as total_sakit"),
                DB::raw("COUNT(CASE WHEN attendance_records.status = 'alpa' THEN 1 END) as total_alpa"),
                DB::raw("COUNT(attendance_records.id) as total_session")
            )
            ->groupBy('students.id', 'students.name', 'students.nis', 'students.gender', 'school_classes.name');

        if ($startDate && $endDate) {
            $query->whereBetween('attendance_sessions.session_date', [$startDate, $endDate]);
        }

        if ($groupId) {
            $query->where('attendance_records.group_id', $groupId);
        }

        $results = $query->orderBy('students.name')->get();

        $rows = $results->map(function ($r) {
            $totalKehadiran = $r->total_hadir + $r->total_terlambat;
            $percentage = $r->total_session > 0 ? ($totalKehadiran / $r->total_session) * 100 : 0;
            return [
                'name' => $r->name,
                'nis' => $r->nis,
                'className' => $r->class_name,
                'gender' => $r->gender === 'L' ? 'Laki-laki' : 'Perempuan',
                'hadir' => $r->total_hadir,
                'terlambat' => $r->total_terlambat,
                'izin' => $r->total_izin,
                'sakit' => $r->total_sakit,
                'alpa' => $r->total_alpa,
                'percentage' => $percentage
            ];
        });

        return response()->json([
            'ok' => true,
            'rows' => $rows
        ]);
    }
}
