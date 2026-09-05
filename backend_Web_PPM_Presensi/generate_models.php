<?php

$models = [
    'SchoolClass' => [
        'table' => 'classes',
        'relations' => "
    public function groups() { return \$this->hasMany(Group::class, 'class_id'); }
    public function students() { return \$this->hasMany(Student::class, 'class_id'); }
"
    ],
    'Group' => [
        'table' => 'groups',
        'relations' => "
    public function schoolClass() { return \$this->belongsTo(SchoolClass::class, 'class_id'); }
"
    ],
    'Student' => [
        'table' => 'students',
        'relations' => "
    public function schoolClass() { return \$this->belongsTo(SchoolClass::class, 'class_id'); }
    public function history() { return \$this->hasMany(StudentClassHistory::class, 'student_id'); }
"
    ],
    'StudentClassHistory' => [
        'table' => 'student_class_history',
        'relations' => "
    public function student() { return \$this->belongsTo(Student::class, 'student_id'); }
    public function schoolClass() { return \$this->belongsTo(SchoolClass::class, 'class_id'); }
"
    ],
    'AttendanceOperator' => [
        'table' => 'attendance_operators',
        'relations' => "
    public function student() { return \$this->belongsTo(Student::class, 'student_id'); }
    public function group() { return \$this->belongsTo(Group::class, 'group_id'); }
"
    ],
    'SessionSetting' => [
        'table' => 'session_settings',
        'relations' => ""
    ],
    'AttendanceSession' => [
        'table' => 'attendance_sessions',
        'relations' => "
    public function sessionGroups() { return \$this->hasMany(SessionGroup::class, 'session_id'); }
    public function attendanceRecords() { return \$this->hasMany(AttendanceRecord::class, 'session_id'); }
"
    ],
    'SessionGroup' => [
        'table' => 'session_groups',
        'relations' => "
    public function session() { return \$this->belongsTo(AttendanceSession::class, 'session_id'); }
    public function group() { return \$this->belongsTo(Group::class, 'group_id'); }
"
    ],
    'AttendanceRecord' => [
        'table' => 'attendance_records',
        'relations' => "
    public function session() { return \$this->belongsTo(AttendanceSession::class, 'session_id'); }
    public function student() { return \$this->belongsTo(Student::class, 'student_id'); }
    public function group() { return \$this->belongsTo(Group::class, 'group_id'); }
    public function operator() { return \$this->belongsTo(AttendanceOperator::class, 'operator_id'); }
"
    ]
];

foreach ($models as $name => $data) {
    $content = <<<PHP
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class {$name} extends Model
{
    use HasUuids;

    protected \$table = '{$data['table']}';
    protected \$guarded = [];
{$data['relations']}
}

PHP;
    file_put_contents(__DIR__ . "/app/Models/{$name}.php", $content);
}

echo "Models generated.\n";
