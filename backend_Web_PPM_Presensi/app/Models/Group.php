<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasUuids;

    protected $table = 'groups';
    protected $guarded = [];

    public function schoolClass() { return $this->belongsTo(SchoolClass::class, 'class_id'); }

}
