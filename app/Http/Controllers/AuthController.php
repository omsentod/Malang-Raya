<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Handle an AJAX login request.
     */
    public function ajaxLogin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'password.required' => 'Password wajib diisi.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()->all()
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials, true)) {
            $request->session()->regenerate();
            $user = Auth::user();
            return response()->json([
                'success' => true,
                'message' => 'Berhasil masuk ke akun!',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'bio' => $user->bio,
                    'role' => $user->role ?? 'user',
                    'pref_wisata' => $user->pref_wisata ?? [],
                    'pref_hotel' => $user->pref_hotel ?? [],
                    'pref_kuliner' => $user->pref_kuliner ?? [],
                    'pref_strength' => $user->pref_strength ?? 0.0
                ]
            ]);
        }

        return response()->json([
            'success' => false,
            'errors' => ['Usernama/Password salah']
        ], 401);
    }

    /**
     * Handle an AJAX registration request.
     */
    public function ajaxRegister(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal harus 6 karakter.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()->all()
            ], 422);
        }

        $isFirstUser = User::count() === 0;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'avatar' => 'explorer', // Default preset avatar
            'bio' => 'Wisatawan penjelajah Malang Raya!', // Default bio
            'role' => $isFirstUser ? 'admin' : 'user'
        ]);

        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Akun berhasil dibuat!',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'bio' => $user->bio,
                'role' => $user->role ?? 'user'
            ]
        ]);
    }

    /**
     * Log the user out of the application.
     */
    public function ajaxLogout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Berhasil keluar!'
        ]);
    }

    /**
     * Get the authenticated user's status.
     */
    public function checkAuthStatus()
    {
        if (Auth::check()) {
            $user = Auth::user();
            return response()->json([
                'logged_in' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'bio' => $user->bio,
                    'role' => $user->role ?? 'user',
                    'pref_wisata' => $user->pref_wisata ?? [],
                    'pref_hotel' => $user->pref_hotel ?? [],
                    'pref_kuliner' => $user->pref_kuliner ?? [],
                    'pref_strength' => $user->pref_strength ?? 0.0
                ]
            ]);
        }

        return response()->json([
            'logged_in' => false
        ]);
    }

    /**
     * Update user bio and avatar profile.
     */
    public function ajaxUpdateProfile(Request $request)
    {
        $user = Auth::user();

        if (!$user instanceof User) {
            return response()->json(['success' => false, 'errors' => ['Tidak terautentikasi.']], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'bio' => 'nullable|string|max:500',
            'avatar' => 'nullable|string',
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar oleh pengguna lain.',
            'bio.max' => 'Biografi maksimal 500 karakter.'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()->all()
            ], 422);
        }

        $user->name = $request->name;
        $user->email = $request->email;
        $user->bio = $request->bio;
        if ($request->has('avatar')) {
            $user->avatar = $request->avatar;
        }

        if ($request->has('pref_wisata')) {
            $user->pref_wisata = array_filter((array)$request->pref_wisata);
        }
        if ($request->has('pref_hotel')) {
            $user->pref_hotel = array_filter((array)$request->pref_hotel);
        }
        if ($request->has('pref_kuliner')) {
            $user->pref_kuliner = array_filter((array)$request->pref_kuliner);
        }
        if ($request->has('pref_wisata') || $request->has('pref_hotel') || $request->has('pref_kuliner')) {
             $user->pref_strength = (!empty($user->pref_wisata) || !empty($user->pref_hotel) || !empty($user->pref_kuliner)) ? 0.8 : 0.0;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui!',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'bio' => $user->bio,
                'role' => $user->role ?? 'user'
            ]
        ]);
    }
}
