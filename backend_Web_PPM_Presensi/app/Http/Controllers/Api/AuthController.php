<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        // Using simple admin check from .env for migration simplicity,
        // or a User table if seeded. Let's use User table.
        $user = User::where('email', $request->username)->orWhere('name', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Fallback to .env admin
            if ($request->username === env('ADMIN_USERNAME') && $request->password === env('ADMIN_PASSWORD')) {
                $user = User::firstOrCreate(
                    ['email' => 'admin@admin.com'],
                    ['name' => 'Admin', 'password' => Hash::make($request->password)]
                );
            } else {
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        }

        $token = $user->createToken('admin-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}