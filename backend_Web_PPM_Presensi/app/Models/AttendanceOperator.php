<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AttendanceOperator extends Model
{
    use HasUuids;

    protected $table = 'attendance_operators';
    protected $guarded = [];

    public function student() { return $this->belongsTo(Student::class, 'student_id'); }
    public function group() { return $this->belongsTo(Group::class, 'group_id'); }

}
