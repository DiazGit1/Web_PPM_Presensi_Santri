<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    use HasUuids;

    protected $table = 'classes';
    protected $guarded = [];

    public function groups() { return $this->hasMany(Group::class, 'class_id'); }
    public function students() { return $this->hasMany(Student::class, 'class_id'); }

}
