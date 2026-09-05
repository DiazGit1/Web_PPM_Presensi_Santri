<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\SessionGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SessionController extends Controller
{
    public function index(Request $request)
    {
        $limit = $request->query('limit', 30);
        $sessions = AttendanceSession::with('sessionGroups.group')
            ->orderBy('session_date', 'desc')
            ->orderBy('session_type', 'desc')
            ->limit($limit)
            ->get();
        return response()->json([
            'ok' => true,
            'sessions' => $sessions
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sessionDate' => 'required|date',
            'sessionType' => 'required|string',
            'scanStartTime' => 'required|date_format:H:i',
            'onTimeUntil' => 'required|date_format:H:i',
            'endTime' => 'required|date_format:H:i',
            'groupIds' => 'array',
            'groupIds.*' => 'uuid|exists:groups,id'
        ]);

        try {
            DB::beginTransaction();

            $existing = AttendanceSession::where('session_date', $validated['sessionDate'])
                ->where('session_type', $validated['sessionType'])
                ->first();

            if ($existing) {
                return response()->json(['message' => 'Sesi untuk tanggal dan tipe tersebut sudah ada.'], 400);
            }

            $session = AttendanceSession::create([
                'session_date' => $validated['sessionDate'],
                'session_type' => $validated['sessionType'],
                'scan_start_time' => $validated['scanStartTime'],
                'on_time_until' => $validated['onTimeUntil'],
                'end_time' => $validated['endTime'],
                'status' => 'open'
            ]);

            if (isset($validated['groupIds']) && count($validated['groupIds']) > 0) {
                $sessionGroups = array_map(function($groupId) use ($session) {
                    return [
                        'id' => \Illuminate\Support\Str::uuid()->toString(),
                        'session_id' => $session->id,
                        'group_id' => $groupId,
                        'opened' => true,
                        'closed_manually' => false,
                        'finalized' => false,
                        'created_at' => now(),
                        'updated_at' => now()
                    ];
                }, $validated['groupIds']);
                
                SessionGroup::insert($sessionGroups);
            }

            DB::commit();
            return response()->json($session, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membuka sesi: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $session = AttendanceSession::with('sessionGroups.group')->find($id);
        if (!$session) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return response()->json($session);
    }

    public function destroy($id)
    {
        $session = AttendanceSession::find($id);
        if ($session) {
            $session->delete();
        }
        return response()->json(['message' => 'Deleted']);
    }

    public function toggleGroup(Request $request, $sessionId, $groupId)
    {
        $validated = $request->validate([
            'action' => 'required|in:close,reopen'
        ]);

        $sg = SessionGroup::where('session_id', $sessionId)
            ->where('group_id', $groupId)
            ->first();

        if (!$sg) {
            return response()->json(['message' => 'Kelompok tidak ditemukan pada sesi ini.'], 404);
        }

        $sg->closed_manually = $validated['action'] === 'close';
        $sg->save();

        return response()->json(['message' => 'Status kelompok berhasil diubah.']);
    }

    public function summaryToday()
    {
        $today = now()->toDateString();
        $sessions = AttendanceSession::where('session_date', $today)
            ->orderBy('session_type', 'asc')
            ->get();
        return response()->json($sessions);
    }
}