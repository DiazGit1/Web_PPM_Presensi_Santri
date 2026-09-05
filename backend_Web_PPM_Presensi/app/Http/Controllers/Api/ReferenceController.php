<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Group;
use App\Models\SessionSetting;
use Illuminate\Http\Request;

class ReferenceController extends Controller
{
    public function index()
    {
        return response()->json([
            'classes' => SchoolClass::orderBy('sort_order')->get(),
            'groups' => Group::with('schoolClass')->orderBy('sort_order')->orderBy('gender')->get(),
            'sessionSettings' => SessionSetting::all()
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.session_type' => 'required|string',
            'settings.*.scan_start_time' => 'required',
            'settings.*.on_time_until' => 'required',
            'settings.*.end_time' => 'required',
        ]);

        foreach ($validated['settings'] as $setting) {
            SessionSetting::updateOrCreate(
                ['session_type' => $setting['session_type']],
                [
                    'scan_start_time' => $setting['scan_start_time'],
                    'on_time_until' => $setting['on_time_until'],
                    'end_time' => $setting['end_time']
                ]
            );
        }

        return response()->json(['message' => 'Settings updated']);
    }
}
