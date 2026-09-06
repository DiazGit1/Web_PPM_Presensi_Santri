<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AttendanceOperator;
use App\Models\Student;

class OperatorController extends Controller
{
    public function index()
    {
        $operators = AttendanceOperator::with(['student', 'group'])->get()->map(function($op) {
            return [
                'id' => $op->id,
                'nis' => $op->student->nis ?? null,
                'student_name' => $op->student->name ?? null,
                'student_active' => $op->student->active ?? false,
                'group_name' => $op->group->name ?? null,
                'active' => $op->active
            ];
        });

        return response()->json([
            'ok' => true,
            'operators' => $operators
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nis' => 'required|string',
            'groupId' => 'required|string|exists:groups,id'
        ]);

        $student = Student::where('nis', $request->nis)->first();

        if (!$student) {
            return response()->json([
                'ok' => false,
                'message' => 'Santri dengan NIS tersebut tidak ditemukan.'
            ], 404);
        }

        $exists = AttendanceOperator::where('student_id', $student->id)
            ->where('group_id', $request->groupId)
            ->exists();

        if ($exists) {
            return response()->json([
                'ok' => false,
                'message' => 'Santri ini sudah menjadi petugas untuk kelompok tersebut.'
            ], 422);
        }

        AttendanceOperator::create([
            'student_id' => $student->id,
            'group_id' => $request->groupId,
            'active' => true
        ]);

        return response()->json([
            'ok' => true,
            'studentName' => $student->name
        ]);
    }

    public function update(Request $request, $id)
    {
        $op = AttendanceOperator::findOrFail($id);
        
        $request->validate([
            'active' => 'required|boolean'
        ]);

        $op->update([
            'active' => $request->active
        ]);

        return response()->json([
            'ok' => true
        ]);
    }

    public function destroy($id)
    {
        $op = AttendanceOperator::findOrFail($id);
        $op->delete();

        return response()->json([
            'ok' => true,
            'message' => 'Petugas berhasil dihapus.'
        ]);
    }
}
