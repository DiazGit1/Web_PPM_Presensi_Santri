<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SessionGroup extends Model
{
    use HasUuids;

    protected $table = 'session_groups';
    protected $guarded = [];

    public function session() { return $this->belongsTo(AttendanceSession::class, 'session_id'); }
    public function group() { return $this->belongsTo(Group::class, 'group_id'); }

}
