<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\SchoolClass;
use App\Models\Group;
use App\Models\Student;
use App\Models\StudentClassHistory;
use App\Models\AttendanceOperator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Admin
        User::firstOrCreate(
            ['email' => 'admin'],
            ['name' => 'Administrator', 'password' => Hash::make('123')]
        );

        // 2. Create Classes
        $classes = [
            ['name' => 'Bacaan', 'sort_order' => 1],
            ['name' => 'Lambatan', 'sort_order' => 2],
            ['name' => 'Cepatan', 'sort_order' => 3],
        ];

        foreach ($classes as $c) {
            SchoolClass::firstOrCreate(['name' => $c['name']], $c);
        }

        // 3. Create Groups
        $allClasses = SchoolClass::all();
        foreach ($allClasses as $c) {
            foreach (['L', 'P'] as $gender) {
                Group::firstOrCreate([
                    'class_id' => $c->id,
                    'gender' => $gender
                ], [
                    'name' => $c->name . ' ' . ($gender == 'L' ? 'Putra' : 'Putri'),
                    'sort_order' => $c->sort_order
                ]);
            }
        }

        // 4. Create Dummy Student (Scanner Operator & Normal Student)
        $kelasCepatan = SchoolClass::where('name', 'Cepatan')->first();

        $operatorStudent = Student::firstOrCreate(['nis' => '1111'], [
            'name' => 'Budi Petugas',
            'class_id' => $kelasCepatan->id,
            'gender' => 'L',
            'generation' => '2024',
            'active' => true
        ]);

        StudentClassHistory::firstOrCreate(['student_id' => $operatorStudent->id], [
            'class_id' => $kelasCepatan->id,
            'gender' => 'L',
            'effective_from' => '2024-01-01',
        ]);

        $normalStudent = Student::firstOrCreate(['nis' => '2222'], [
            'name' => 'Andi Santri',
            'class_id' => $kelasCepatan->id,
            'gender' => 'L',
            'generation' => '2024',
            'active' => true
        ]);

        StudentClassHistory::firstOrCreate(['student_id' => $normalStudent->id], [
            'class_id' => $kelasCepatan->id,
            'gender' => 'L',
            'effective_from' => '2024-01-01',
        ]);

        // 5. Create Operator
        $groupCepatanL = Group::where('class_id', $kelasCepatan->id)->where('gender', 'L')->first();
        AttendanceOperator::firstOrCreate(['student_id' => $operatorStudent->id], [
            'group_id' => $groupCepatanL->id,
            'active' => true
        ]);
    }
}
