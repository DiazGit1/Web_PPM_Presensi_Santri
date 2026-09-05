<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentClassHistory;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with('schoolClass');

        if ($request->has('classId')) {
            $query->where('class_id', $request->classId);
        }

        if ($request->has('active')) {
            // "1" or "true" string to boolean in PHP
            $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
            $query->where('active', $isActive);
        }

        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('nis', 'LIKE', "%{$search}%");
            });
        }

        $query->orderBy('name', 'asc');

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nis' => 'required|string|unique:students,nis',
            'name' => 'required|string',
            'classId' => 'required|uuid|exists:classes,id',
            'gender' => 'required|in:L,P',
            'generation' => 'nullable|string',
            'active' => 'boolean'
        ]);

        try {
            DB::beginTransaction();

            $student = Student::create([
                'nis' => $validated['nis'],
                'name' => $validated['name'],
                'class_id' => $validated['classId'],
                'gender' => $validated['gender'],
                'generation' => $validated['generation'] ?? null,
                'active' => $validated['active'] ?? true,
            ]);

            // Add history
            StudentClassHistory::create([
                'student_id' => $student->id,
                'class_id' => $student->class_id,
                'gender' => $student->gender,
                'effective_from' => now()->toDateString(),
                'effective_to' => null,
            ]);

            DB::commit();
            return response()->json($student, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create student: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $student = Student::with(['schoolClass', 'history.schoolClass'])->findOrFail($id);
        return response()->json($student);
    }

    public function update(Request $request, $id)
    {
        $student = Student::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'generation' => 'nullable|string',
            'active' => 'sometimes|boolean',
            'classId' => 'sometimes|uuid|exists:classes,id',
            'gender' => 'sometimes|in:L,P',
        ]);

        try {
            DB::beginTransaction();

            $classChanged = false;
            $oldClassId = $student->class_id;
            $oldGender = $student->gender;

            if (isset($validated['classId'])) {
                $student->class_id = $validated['classId'];
            }
            if (isset($validated['gender'])) {
                $student->gender = $validated['gender'];
            }
            if (isset($validated['name'])) {
                $student->name = $validated['name'];
            }
            if (array_key_exists('generation', $validated)) {
                $student->generation = $validated['generation'];
            }
            if (isset($validated['active'])) {
                $student->active = $validated['active'];
            }

            if ($student->class_id !== $oldClassId || $student->gender !== $oldGender) {
                $classChanged = true;
            }

            $student->save();

            if ($classChanged) {
                // Close the old history
                $activeHistory = StudentClassHistory::where('student_id', $student->id)
                    ->whereNull('effective_to')
                    ->first();
                
                if ($activeHistory) {
                    $activeHistory->effective_to = now()->subDay()->toDateString();
                    $activeHistory->save();
                }

                // Create new history
                StudentClassHistory::create([
                    'student_id' => $student->id,
                    'class_id' => $student->class_id,
                    'gender' => $student->gender,
                    'effective_from' => now()->toDateString(),
                    'effective_to' => null,
                ]);
            }

            DB::commit();
            return response()->json($student);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update student: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $student = Student::findOrFail($id);
        $student->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // Accept JSON array of students to import
    public function import(Request $request)
    {
        $request->validate([
            'rows' => 'required|array',
            'rows.*.nis' => 'required',
            'rows.*.name' => 'required',
            'rows.*.className' => 'required',
            'rows.*.gender' => 'required|in:L,P',
            'rows.*.active' => 'required|boolean'
        ]);

        $rows = $request->rows;
        $results = [];

        // Pre-fetch classes for mapping
        $classes = SchoolClass::all()->keyBy(function($item) {
            return strtolower(trim($item->name));
        });

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2;
            $nis = trim($row['nis']);
            $className = strtolower(trim($row['className']));

            $class = $classes->get($className);
            if (!$class) {
                $results[] = ['row' => $rowNum, 'nis' => $nis, 'status' => 'error', 'message' => "Kelas '{$row['className']}' tidak ditemukan."];
                continue;
            }

            $existing = Student::where('nis', $nis)->first();
            if ($existing) {
                $results[] = ['row' => $rowNum, 'nis' => $nis, 'status' => 'skipped', 'message' => 'NIS sudah terdaftar.'];
                continue;
            }

            try {
                DB::beginTransaction();
                $student = Student::create([
                    'nis' => $nis,
                    'name' => trim($row['name']),
                    'class_id' => $class->id,
                    'gender' => $row['gender'],
                    'generation' => $row['generation'] ?? null,
                    'active' => $row['active'],
                ]);
                
                StudentClassHistory::create([
                    'student_id' => $student->id,
                    'class_id' => $student->class_id,
                    'gender' => $student->gender,
                    'effective_from' => now()->toDateString(),
                    'effective_to' => null,
                ]);
                DB::commit();
                $results[] = ['row' => $rowNum, 'nis' => $nis, 'status' => 'created'];
            } catch (\Exception $e) {
                DB::rollBack();
                $results[] = ['row' => $rowNum, 'nis' => $nis, 'status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return response()->json($results);
    }
}