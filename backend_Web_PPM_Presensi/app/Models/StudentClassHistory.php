<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class StudentClassHistory extends Model
{
    use HasUuids;

    protected $table = 'student_class_history';
    protected $guarded = [];

    public function student() { return $this->belongsTo(Student::class, 'student_id'); }
    public function schoolClass() { return $this->belongsTo(SchoolClass::class, 'class_id'); }

}
