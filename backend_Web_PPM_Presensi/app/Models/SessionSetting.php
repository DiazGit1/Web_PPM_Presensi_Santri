<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SessionSetting extends Model
{
    use HasUuids;

    protected $table = 'session_settings';
    protected $guarded = [];

}
