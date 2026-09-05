<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use HasUuids;

    protected $table = 'attendance_records';
    protected $guarded = [];

    public function session() { return $this->belongsTo(AttendanceSession::class, 'session_id'); }
    public function student() { return $this->belongsTo(Student::class, 'student_id'); }
    public function group() { return $this->belongsTo(Group::class, 'group_id'); }
    public function operator() { return $this->belongsTo(AttendanceOperator::class, 'operator_id'); }

}
