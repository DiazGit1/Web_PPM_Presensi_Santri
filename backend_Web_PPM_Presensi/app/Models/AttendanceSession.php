<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    use HasUuids;

    protected $table = 'attendance_sessions';
    protected $guarded = [];

    public function sessionGroups() { return $this->hasMany(SessionGroup::class, 'session_id'); }
    public function attendanceRecords() { return $this->hasMany(AttendanceRecord::class, 'session_id'); }

}
