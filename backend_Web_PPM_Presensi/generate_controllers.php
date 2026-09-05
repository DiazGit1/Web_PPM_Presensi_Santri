<?php

$dir = __DIR__ . '/app/Http/Controllers/Api';
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

$authController = <<<PHP
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request \$request)
    {
        \$request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        // Using simple admin check from .env for migration simplicity,
        // or a User table if seeded. Let's use User table.
        \$user = User::where('email', \$request->username)->orWhere('name', \$request->username)->first();

        if (!\$user || !Hash::check(\$request->password, \$user->password)) {
            // Fallback to .env admin
            if (\$request->username === env('ADMIN_USERNAME') && \$request->password === env('ADMIN_PASSWORD')) {
                \$user = User::firstOrCreate(
                    ['email' => 'admin@admin.com'],
                    ['name' => 'Admin', 'password' => Hash::make(\$request->password)]
                );
            } else {
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        }

        \$token = \$user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'user' => \$user,
            'token' => \$token
        ]);
    }

    public function logout(Request \$request)
    {
        \$request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}
PHP;

$studentController = <<<PHP
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index()
    {
        return Student::with('schoolClass')->get();
    }

    public function show(\$id)
    {
        return Student::with(['schoolClass', 'history'])->findOrFail(\$id);
    }
}
PHP;

$sessionController = <<<PHP
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index()
    {
        return AttendanceSession::with('sessionGroups.group')->orderBy('session_date', 'desc')->get();
    }
}
PHP;

$attendanceController = <<<PHP
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function record(Request \$request)
    {
        // Placeholder for QR scan logic
        return response()->json(['message' => 'Attendance recorded successfully']);
    }
}
PHP;

file_put_contents($dir . '/AuthController.php', $authController);
file_put_contents($dir . '/StudentController.php', $studentController);
file_put_contents($dir . '/SessionController.php', $sessionController);
file_put_contents($dir . '/AttendanceController.php', $attendanceController);

echo "API Controllers generated.\n";
