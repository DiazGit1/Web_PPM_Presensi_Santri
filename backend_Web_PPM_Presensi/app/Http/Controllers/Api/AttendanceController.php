<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\SessionGroup;
use App\Models\Student;
use App\Models\StudentClassHistory;
use App\Models\AttendanceOperator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->query('from');
        $endDate = $request->query('to');
        $groupId = $request->query('groupId');
        $isLatest = $request->query('latest') === 'true';

        $sessionsQuery = DB::table('attendance_sessions')
            ->select('id as sessionId', 'session_date as date', 'session_type as type', 'scan_start_time', 'end_time');

        if ($isLatest) {
            $sessionsQuery->orderBy('session_date', 'desc')
                          ->orderBy('scan_start_time', 'desc')
                          ->limit(1);
        } else {
            $sessionsQuery->orderBy('session_date', 'asc')
                          ->orderBy('scan_start_time', 'asc');
            if ($startDate && $endDate) {
                $sessionsQuery->whereBetween('session_date', [$startDate, $endDate]);
            }
        }
        
        if ($groupId) {
            $sessionsQuery->join('session_groups', 'attendance_sessions.id', '=', 'session_groups.session_id')
                          ->where('session_groups.group_id', $groupId);
        }
        
        $sessions = $sessionsQuery->get()->map(function($s) {
            $s->label = ucfirst($s->type);
            return $s;
        });

        $sessionIds = $sessions->pluck('sessionId')->toArray();
        if (empty($sessionIds)) return response()->json(['ok' => true, 'sessions' => [], 'rows' => []]);

        $recordsQuery = DB::table('attendance_records')
            ->whereIn('session_id', $sessionIds)
            ->select('student_id', 'session_id', 'status', 'scanned_at', 'created_at');
            
        if ($groupId) {
            $recordsQuery->where('group_id', $groupId);
        }
        $records = $recordsQuery->get();

        $sessionGroups = DB::table('session_groups')
            ->whereIn('session_id', $sessionIds)
            ->get();

        $studentsQuery = Student::with('schoolClass')->where('active', true);
        if ($groupId) {
            $group = \App\Models\Group::find($groupId);
            if ($group) {
                $studentsQuery->where('class_id', $group->class_id)
                              ->where('gender', $group->gender);
            }
        }
        $students = $studentsQuery->orderBy('name')->get();

        $groups = \App\Models\Group::all();
        $getGroupId = function($student) use ($groups) {
            $g = $groups->where('class_id', $student->class_id)->where('gender', $student->gender)->first();
            return $g ? $g->id : null;
        };

        $rows = [];
        foreach ($students as $student) {
            $cells = [];
            $hasAnyData = false;
            $sGroupId = $getGroupId($student);

            foreach ($sessions as $session) {
                $sg = $sessionGroups->where('session_id', $session->sessionId)
                                    ->where('group_id', $sGroupId)
                                    ->first();
                if ($sg) {
                    $record = $records->where('student_id', $student->id)->where('session_id', $session->sessionId)->first();
                    if ($record) {
                        $time = $record->scanned_at ?? $record->created_at;
                        $cells[$session->sessionId] = [
                            'status' => $record->status,
                            'time' => $time ? \Carbon\Carbon::parse($time)->format('H:i') : '-'
                        ];
                    } else {
                        $cells[$session->sessionId] = [
                            'status' => 'alpa',
                            'time' => '-'
                        ];
                    }
                    $hasAnyData = true;
                } else {
                    $cells[$session->sessionId] = null;
                }
            }

            if ($hasAnyData) {
                $rows[] = [
                    'studentId' => $student->id,
                    'name' => $student->name,
                    'nis' => $student->nis,
                    'gender' => $student->gender,
                    'className' => $student->schoolClass ? $student->schoolClass->name : '-',
                    'cells' => (object)$cells
                ];
            }
        }

        return response()->json([
            'ok' => true,
            'sessions' => $sessions,
            'rows' => $rows
        ]);
    }

    private function getStudentGroupOnDate($studentId, $dateStr)
    {
        $history = StudentClassHistory::with('schoolClass')
            ->where('student_id', $studentId)
            ->where('effective_from', '<=', $dateStr)
            ->where(function($q) use ($dateStr) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $dateStr);
            })
            ->orderBy('effective_from', 'desc')
            ->first();
            
        if (!$history) return null;
        
        // Find group ID
        $group = \App\Models\Group::where('class_id', $history->class_id)
            ->where('gender', $history->gender)
            ->first();
            
        if (!$group) return null;
        
        return [
            'classId' => $history->class_id,
            'groupId' => $group->id,
            'gender' => $history->gender,
            'groupName' => $group->name
        ];
    }

    public function getScannerState()
    {
        $now = now();
        $todayStr = $now->toDateString();

        $sessions = AttendanceSession::where('session_date', $todayStr)
            ->where('status', 'open')
            ->get();

        if ($sessions->isEmpty()) return response()->json(['ok' => true, 'state' => 'none']);

        foreach ($sessions as $s) {
            $start = Carbon::parse($todayStr . ' ' . $s->scan_start_time);
            $end = Carbon::parse($todayStr . ' ' . $s->end_time);
            if ($now->between($start, $end)) {
                return response()->json([
                    'ok' => true,
                    'state' => 'active',
                    'sessionId' => $s->id,
                    'sessionType' => $s->session_type,
                    'label' => ucfirst($s->session_type),
                    'endTime' => $s->end_time
                ]);
            }
        }

        // Check upcoming
        $upcoming = $sessions->filter(function($s) use ($now, $todayStr) {
            $start = Carbon::parse($todayStr . ' ' . $s->scan_start_time);
            return $now->lt($start);
        })->sortBy('scan_start_time')->first();

        if ($upcoming) {
            return response()->json([
                'ok' => true,
                'state' => 'not_started',
                'sessionType' => $upcoming->session_type,
                'label' => ucfirst($upcoming->session_type),
                'scanStartTime' => $upcoming->scan_start_time
            ]);
        }

        return response()->json(['ok' => true, 'state' => 'none']);
    }

    public function validateOperator(Request $request)
    {
        $nis = $request->input('nis');
        
        $student = Student::where('nis', trim($nis))->where('active', true)->first();
        if (!$student) {
            return response()->json(['ok' => false, 'message' => 'NIS tidak terdaftar atau tidak aktif.']);
        }

        $operator = AttendanceOperator::with('group')
            ->where('student_id', $student->id)
            ->where('active', true)
            ->first();

        if (!$operator) {
            return response()->json(['ok' => false, 'message' => 'Bukan petugas presensi aktif.']);
        }

        return response()->json([
            'ok' => true,
            'operatorId' => $operator->id,
            'studentName' => $student->name,
            'groupName' => $operator->group ? $operator->group->name : '-'
        ]);
    }

    private function finalizeExpiredSessionGroups()
    {
        $now = now();
        $candidates = DB::table('session_groups as sg')
            ->join('attendance_sessions as s', 'sg.session_id', '=', 's.id')
            ->join('groups as g', 'sg.group_id', '=', 'g.id')
            ->select('sg.id', 'sg.session_id', 'sg.group_id', 's.session_date', 's.end_time', 'g.class_id', 'g.gender', 'g.name as group_name')
            ->where('sg.finalized', 0)
            ->where('sg.opened', 1)
            ->get();

        foreach ($candidates as $row) {
            $endInstant = Carbon::parse($row->session_date . ' ' . $row->end_time);
            if ($now->lt($endInstant)) continue;

            $activeStudents = Student::where('active', 1)->get();
            $recordedStudentIds = AttendanceRecord::where('session_id', $row->session_id)
                ->pluck('student_id')
                ->toArray();

            $alpaData = [];
            foreach ($activeStudents as $s) {
                if (in_array($s->id, $recordedStudentIds)) continue;

                $group = $this->getStudentGroupOnDate($s->id, $row->session_date);
                if (!$group || $group['groupId'] !== $row->group_id) continue;

                $alpaData[] = [
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'session_id' => $row->session_id,
                    'student_id' => $s->id,
                    'group_id' => $row->group_id,
                    'status' => 'alpa',
                    'scanned_at' => null,
                    'source' => 'auto_alpa',
                    'operator_id' => null,
                    'class_id_snapshot' => $row->class_id,
                    'group_name_snapshot' => $row->group_name,
                    'gender_snapshot' => $row->gender,
                    'created_at' => now(),
                    'updated_at' => now()
                ];
            }

            if (count($alpaData) > 0) {
                AttendanceRecord::insertOrIgnore($alpaData);
            }

            SessionGroup::where('id', $row->id)->update([
                'finalized' => 1,
                'finalized_at' => now()
            ]);
        }
    }

    public function record(Request $request)
    {
        $validated = $request->validate([
            'nis' => 'required|string',
            'operatorId' => 'required|uuid'
        ]);

        $this->finalizeExpiredSessionGroups();

        $now = now();
        $todayStr = $now->toDateString();

        $student = Student::where('nis', trim($validated['nis']))->first();
        if (!$student) return response()->json(['ok' => false, 'message' => 'Santri tidak ditemukan.'], 404);
        if (!$student->active) return response()->json(['ok' => false, 'message' => 'Santri tidak aktif.'], 400);

        $sessions = AttendanceSession::where('session_date', $todayStr)->where('status', 'open')->get();
        $activeSession = $sessions->first(function($s) use ($now, $todayStr) {
            $start = Carbon::parse($todayStr . ' ' . $s->scan_start_time);
            $end = Carbon::parse($todayStr . ' ' . $s->end_time);
            return $now->between($start, $end);
        });

        if (!$activeSession) {
            return response()->json(['ok' => false, 'message' => 'Sesi presensi belum dimulai atau sudah berakhir.'], 400);
        }

        $group = $this->getStudentGroupOnDate($student->id, $todayStr);
        if (!$group) return response()->json(['ok' => false, 'message' => 'Kelas santri tidak valid.'], 400);

        $sg = SessionGroup::where('session_id', $activeSession->id)->where('group_id', $group['groupId'])->first();
        if (!$sg || !$sg->opened || $sg->closed_manually) {
            return response()->json(['ok' => false, 'message' => 'Kelompok santri tidak dibuka untuk sesi ini.'], 400);
        }

        $onTimeUntil = Carbon::parse($todayStr . ' ' . $activeSession->on_time_until);
        $status = $now->lt($onTimeUntil) ? 'hadir' : 'terlambat';

        $exists = AttendanceRecord::where('session_id', $activeSession->id)
            ->where('student_id', $student->id)
            ->exists();
        if ($exists) return response()->json(['ok' => false, 'message' => $student->name . ' sudah melakukan presensi.'], 400);

        AttendanceRecord::create([
            'session_id' => $activeSession->id,
            'student_id' => $student->id,
            'group_id' => $group['groupId'],
            'status' => $status,
            'scanned_at' => $now,
            'source' => 'scan',
            'operator_id' => $validated['operatorId'],
            'class_id_snapshot' => $group['classId'],
            'group_name_snapshot' => $group['groupName'],
            'gender_snapshot' => $group['gender']
        ]);

        return response()->json([
            'ok' => true,
            'message' => $status === 'hadir' ? "{$student->name} berhasil hadir (tepat waktu)!" : "{$student->name} hadir (terlambat)!",
            'studentName' => $student->name,
            'status' => $status
        ]);
    }

    public function editStatus(Request $request)
    {
        $validated = $request->validate([
            'sessionId' => 'required|uuid',
            'studentId' => 'required|uuid',
            'status' => 'required|in:hadir,terlambat,izin,sakit,alpa'
        ]);

        $session = AttendanceSession::find($validated['sessionId']);
        if (!$session) return response()->json(['ok' => false, 'message' => 'Sesi tidak ditemukan'], 404);

        $group = $this->getStudentGroupOnDate($validated['studentId'], $session->session_date);
        if (!$group) return response()->json(['ok' => false, 'message' => 'Data kelas santri tidak valid'], 400);

        $sg = SessionGroup::where('session_id', $session->id)->where('group_id', $group['groupId'])->first();
        if (!$sg || !$sg->opened) {
            return response()->json(['ok' => false, 'message' => 'Kelompok tidak dibuka pada sesi ini.'], 400);
        }

        $record = AttendanceRecord::where('session_id', $session->id)->where('student_id', $validated['studentId'])->first();
        
        if ($record) {
            $record->status = $validated['status'];
            $record->source = 'edited';
            $record->save();
        } else {
            AttendanceRecord::create([
                'session_id' => $session->id,
                'student_id' => $validated['studentId'],
                'group_id' => $group['groupId'],
                'status' => $validated['status'],
                'source' => 'edited',
                'class_id_snapshot' => $group['classId'],
                'group_name_snapshot' => $group['groupName'],
                'gender_snapshot' => $group['gender']
            ]);
        }

        return response()->json(['ok' => true, 'message' => 'Status berhasil diperbarui.']);
    }
}