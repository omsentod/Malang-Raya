<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use App\Models\User;

class AdminController extends Controller
{
    private function pythonBinary(): string
    {
        $persistentVenv = '/home/u707667165/python_venv/malang_raya/bin/python';
        if (file_exists($persistentVenv)) return $persistentVenv;

        $localVenv = storage_path('app/python/venv/bin/python');
        if (file_exists($localVenv)) return $localVenv;

        return 'python3';
    }

    private function workingDir(): string
    {
        return storage_path('app/python');
    }

    /**
     * Tampilkan antarmuka Halaman Admin
     */
    public function index()
    {
        return view('admin');
    }

    /**
     * Dapatkan statistik dasar dari dataset & sistem
     */
    public function getStats()
    {
        $wisataPath = storage_path('app/python/datasets/wisata_clean.xlsx');
        $hotelPath = storage_path('app/python/datasets/hotel_clean.xlsx');
        $kulinerPath = storage_path('app/python/datasets/tempat_makan_clean.xlsx');

        // Helper function to count rows in Excel using Python
        $countRows = function ($filePath) {
            if (!file_exists($filePath)) return 0;
            try {
                $process = new Process([
                    $this->pythonBinary(),
                    '-c',
                    "import pandas as pd; df=pd.read_excel('{$filePath}'); print(len(df))"
                ]);
                $process->setWorkingDirectory($this->workingDir());
                $process->run();
                if ($process->isSuccessful()) {
                    return (int) trim($process->getOutput());
                }
            } catch (\Exception $e) {
                // fall through
            }
            return 0;
        };

        $stats = [
            'wisata_count' => $countRows($wisataPath),
            'hotel_count'  => $countRows($hotelPath),
            'kuliner_count' => $countRows($kulinerPath),
            'user_count'   => User::count(),
            'cache_active' => Cache::has('wisata_list_dropdown') ? 'Aktif' : 'Kosong',
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }

    /**
     * Ekspor/Download dataset Excel asli
     */
    public function exportExcel($type)
    {
        if (!in_array($type, ['wisata', 'hotel', 'kuliner'])) {
            return abort(404, 'Kategori tidak valid');
        }

        $filenames = [
            'wisata'  => 'datasets/wisata_clean.xlsx',
            'hotel'   => 'datasets/hotel_clean.xlsx',
            'kuliner' => 'datasets/tempat_makan_clean.xlsx',
        ];

        $filePath = storage_path('app/python/' . $filenames[$type]);

        if (!file_exists($filePath)) {
            return abort(404, "Berkas dataset {$type} tidak ditemukan");
        }

        return response()->download($filePath, "{$type}_clean_backup.xlsx");
    }

    /**
     * Impor file Excel baru (Append atau Replace)
     */
    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
            'type' => 'required|in:wisata,hotel,kuliner',
            'mode' => 'required|in:append,replace',
        ], [
            'file.required' => 'Berkas Excel wajib diunggah.',
            'file.mimes'    => 'Format berkas harus berupa Excel (.xls, .xlsx).',
            'type.required' => 'Kategori dataset wajib dipilih.',
            'mode.required' => 'Mode impor data wajib ditentukan.'
        ]);

        $file = $request->file('file');
        $type = $request->input('type');
        $mode = $request->input('mode');

        // Simpan sementara berkas di storage local
        $tempPath = $file->storeAs('temp', uniqid() . '.' . $file->getClientOriginalExtension());
        $absoluteTempPath = storage_path('app/' . $tempPath);

        // Panggil skrip Python import_excel.py
        $process = new Process([
            $this->pythonBinary(),
            storage_path('app/python/import_excel.py'),
            '--file', $absoluteTempPath,
            '--type', $type,
            '--mode', $mode
        ]);
        $process->setWorkingDirectory($this->workingDir());
        $process->setTimeout(120);

        try {
            $process->run();
            
            // Hapus file sementara
            if (file_exists($absoluteTempPath)) {
                @unlink($absoluteTempPath);
            }

            $output = $process->getOutput();
            $result = json_decode($output, true);

            if (!$process->isSuccessful() || json_last_error() !== JSON_ERROR_NONE || ($result['status'] ?? '') === 'error') {
                $errorMsg = $result['message'] ?? $process->getErrorOutput() ?: 'Proses impor gagal dijalankan oleh Python.';
                return response()->json([
                    'success' => false,
                    'message' => $errorMsg
                ], 422);
            }

            // Bersihkan Cache Dropdown
            Cache::forget('wisata_list_dropdown');

            // Jalankan Rebuild Catalog secara otomatis agar frontend langsung sinkron
            $this->triggerCatalogRebuild();

            return response()->json([
                'success' => true,
                'message' => $result['message'] ?? 'Data Excel berhasil diimpor!',
                'added_rows' => $result['added_rows'] ?? 0,
                'total_rows' => $result['total_rows'] ?? 0
            ]);

        } catch (\Exception $e) {
            if (file_exists($absoluteTempPath)) {
                @unlink($absoluteTempPath);
            }
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Membangun kembali berkas cache catalog_featured.json & search_index.json
     */
    public function rebuildCatalog()
    {
        $success = $this->triggerCatalogRebuild();

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'Cache katalog dan indeks pencarian berhasil dibangun kembali!'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Gagal menjalankan skrip get_catalog.py di sistem Python.'
        ], 500);
    }

    /**
     * Bersihkan cache Laravel
     */
    public function clearCache()
    {
        Cache::forget('wisata_list_dropdown');
        
        return response()->json([
            'success' => true,
            'message' => 'Cache list pariwisata berhasil dibersihkan!'
        ]);
    }

    /**
     * Dapatkan daftar pengguna terdaftar
     */
    public function getUsers()
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at')->get();
        return response()->json([
            'success' => true,
            'users' => $users
        ]);
    }

    /**
     * Ubah tingkat akses (role) pengguna
     */
    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:admin,user'
        ]);

        if ($id == Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak dapat mengubah peran akun Anda sendiri untuk menghindari terkunci dari sistem.'
            ], 403);
        }

        $user = User::findOrFail($id);
        $user->role = $request->role;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => "Peran pengguna '{$user->name}' berhasil diubah menjadi " . strtoupper($user->role)
        ]);
    }

    /**
     * Helper: Menjalankan skrip Python pembangun katalog
     */
    private function triggerCatalogRebuild(): bool
    {
        try {
            $process = new Process([
                $this->pythonBinary(),
                storage_path('app/python/get_catalog.py')
            ]);
            $process->setWorkingDirectory($this->workingDir());
            $process->setTimeout(60);
            $process->run();
            
            return $process->isSuccessful();
        } catch (\Exception $e) {
            return false;
        }
    }
}
