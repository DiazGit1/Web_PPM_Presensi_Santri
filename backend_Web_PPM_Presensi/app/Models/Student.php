<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasUuids;

    protected $table = 'students';
    protected $guarded = [];

    public function schoolClass() { return $this->belongsTo(SchoolClass::class, 'class_id'); }
    public function history() { return $this->hasMany(StudentClassHistory::class, 'student_id'); }

}
