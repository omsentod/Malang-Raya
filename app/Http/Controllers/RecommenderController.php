<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class RecommenderController extends Controller
{
    public function __construct()
    {
        set_time_limit(600);
    }

    private function pythonBinary(): string
    {
        // Prioritas 1: venv permanen di luar direktori deployment (tidak terhapus saat deploy)
        $persistentVenv = '/home/u707667165/python_venv/malang_raya/bin/python';
        if (file_exists($persistentVenv)) return $persistentVenv;

        // Prioritas 2: venv lama di dalam storage (fallback jika persistent belum dibuat)
        $localVenv = storage_path('app/python/venv/bin/python');
        if (file_exists($localVenv)) return $localVenv;

        return 'python3';
    }

    private function workingDir(): string
    {
        return storage_path('app/python');
    }

    /**
     * Halaman utama Recommender (3 workflow tabs)
     */
    public function index()
    {
        // Ambil daftar wisata untuk dropdown Destination-First
        $wisataList = $this->getWisataList();
        return view('recom', compact('wisataList'));
    }

    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'workflow'      => 'required|in:budget,flexible,destination',
            'persons'       => 'required|integer|min:1|max:6',
            'duration'      => 'required|integer|min:1|max:30',
            'budget'        => 'nullable|numeric|min:0',
            'dest_id'       => 'nullable|string',
            'transport'     => 'nullable|string',
            'hotel_mode'    => 'nullable|string|in:same,split',
        ]);

        // Implicit Profiling (Zero-Click Personalization)
        $pref_hemat = 0.33;
        $pref_balanced = 0.33;
        $pref_premium = 0.34;
        
        if (!empty($validated['budget'])) {
            $budgetPerPersonPerDay = $validated['budget'] / ($validated['persons'] * $validated['duration']);
            if ($budgetPerPersonPerDay < 200000) { // Backpacker
                $pref_hemat = 0.80;
                $pref_balanced = 0.20;
                $pref_premium = 0.00;
            } elseif ($budgetPerPersonPerDay > 500000) { // Luxury
                $pref_hemat = 0.00;
                $pref_balanced = 0.30;
                $pref_premium = 0.70;
            }
        }

        // Deterministic Seed basis
        $userId = auth()->id() ?? session()->getId();

        $user = auth()->user();
        $prefWisata = ($user && !empty($user->pref_wisata)) ? (is_array($user->pref_wisata) ? ($user->pref_wisata[0] ?? '') : $user->pref_wisata) : '';
        $prefHotel = ($user && !empty($user->pref_hotel)) ? (is_array($user->pref_hotel) ? ($user->pref_hotel[0] ?? '') : $user->pref_hotel) : '';
        $prefKuliner = ($user && !empty($user->pref_kuliner)) ? (is_array($user->pref_kuliner) ? ($user->pref_kuliner[0] ?? '') : $user->pref_kuliner) : '';

        $args = [
            $this->pythonBinary(),
            storage_path('app/python/recommender_api.py'),
            '--workflow', $validated['workflow'],
            '--persons',  $validated['persons'],
            '--duration', $validated['duration'],
            '--user_id',  (string) $userId,
            '--pref_hemat', (string) $pref_hemat,
            '--pref_balanced', (string) $pref_balanced,
            '--pref_premium', (string) $pref_premium,
        ];

        if (!empty($prefWisata)) {
            $args[] = '--pref_wisata';
            $args[] = (string) $prefWisata;
        }
        if (!empty($prefHotel)) {
            $args[] = '--pref_hotel';
            $args[] = (string) $prefHotel;
        }
        if (!empty($prefKuliner)) {
            $args[] = '--pref_kuliner';
            $args[] = (string) $prefKuliner;
        }

        if (!empty($validated['budget'])) {
            $args[] = '--budget';
            $args[] = $validated['budget'];
        }

        if (!empty($validated['dest_id'])) {
            $args[] = '--dest_id';
            $args[] = $validated['dest_id'];
        }

        if (!empty($validated['transport'])) {
            $args[] = '--transport';
            $args[] = $validated['transport'];
        }

        if (!empty($validated['hotel_mode'])) {
            $args[] = '--hotel_mode';
            $args[] = $validated['hotel_mode'];
        }


        $process = new Process($args);
        $process->setWorkingDirectory($this->workingDir());
        $process->setEnv([
            'OPENBLAS_NUM_THREADS' => '1',
            'MKL_NUM_THREADS' => '1',
            'OMP_NUM_THREADS' => '1',
            'NUMEXPR_NUM_THREADS' => '1',
            'VECLIB_MAXIMUM_THREADS' => '1',
        ]);
        $process->setTimeout(600); // 10 menit untuk memberi waktu pengguna melihat matplotlib

        try {
            $process->mustRun();
            $output = $process->getOutput();
            $result = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['error' => 'Python output bukan JSON yang valid.', 'raw' => $output], 500);
            }

            if (($result['status'] ?? '') === 'success') {
                if (!empty($result['verbose'])) {
                    file_put_contents('php://stdout', "\n" . $result['verbose'] . "\n");
                }
                return response()->json(['status' => 'success', 'data' => $result['data']]);
            } else {
                return response()->json(['error' => $result['message'] ?? 'Unknown error'], 500);
            }

        } catch (ProcessFailedException $e) {
            return response()->json([
                'error' => 'Python process gagal.',
                'detail' => $e->getProcess()->getErrorOutput(),
            ], 500);
        }
    }

    /**
     * API: Jalankan visualisasi How It Works (main.py output JSON)
     */
    public function runVisualization(Request $request)
    {
        $budget  = $request->input('budget', 3000000);
        $persons = $request->input('persons', 2);
        $duration= $request->input('duration', 2);

        $args = [
            $this->pythonBinary(),
            storage_path('app/python/how_it_works_api.py'),
            '--budget',   $budget,
            '--persons',  $persons,
            '--duration', $duration,
        ];

        $process = new Process($args);
        $process->setWorkingDirectory($this->workingDir());
        $process->setEnv([
            'OPENBLAS_NUM_THREADS' => '1',
            'MKL_NUM_THREADS' => '1',
            'OMP_NUM_THREADS' => '1',
            'NUMEXPR_NUM_THREADS' => '1',
            'VECLIB_MAXIMUM_THREADS' => '1',
        ]);
        $process->setTimeout(120);

        try {
            $process->mustRun();
            $output = $process->getOutput();
            $result = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['error' => 'Output bukan JSON valid', 'raw' => substr($output, 0, 500)], 500);
            }
            return response()->json($result);

        } catch (ProcessFailedException $e) {
            return response()->json([
                'error' => 'Proses gagal.',
                'detail' => $e->getProcess()->getErrorOutput(),
            ], 500);
        }
    }

    /**
     * Helper: dapatkan daftar wisata dari xlsx untuk dropdown
     */
    private function getWisataList(): array
    {
        return cache()->remember('wisata_list_dropdown', 86400, function () {
            $args = [
                $this->pythonBinary(),
                '-c',
                'import pandas as pd, json; df=pd.read_excel("datasets/wisata_clean.xlsx"); print(json.dumps(df[["Id_Tempat","Nama_Tempat"]].to_dict("records"), ensure_ascii=False))'
            ];
            $process = new Process($args);
            $process->setWorkingDirectory($this->workingDir());
            $process->setEnv([
                'OPENBLAS_NUM_THREADS' => '1',
                'MKL_NUM_THREADS' => '1',
                'OMP_NUM_THREADS' => '1',
                'NUMEXPR_NUM_THREADS' => '1',
                'VECLIB_MAXIMUM_THREADS' => '1',
            ]);
            $process->setTimeout(30);
            try {
                $process->mustRun();
                return json_decode($process->getOutput(), true) ?? [];
            } catch (\Exception $e) {
                return [];
            }
        });
    }
public function minBudget(Request $request)
{
    $validated = $request->validate([
        'persons'    => 'required|integer|min:1|max:6',
        'duration'   => 'required|integer|min:1|max:30',
        'hotel_mode' => 'nullable|in:same,split',
        'transport'  => 'nullable|string',
        'dest_id'    => 'nullable|string',
    ]);

    $args = [
        $this->pythonBinary(),
        storage_path('app/python/min_budget_api.py'),
        '--persons',    $validated['persons'],
        '--duration',   $validated['duration'],
        '--hotel_mode', $validated['hotel_mode'] ?? 'same',
    ];

    if (!empty($validated['transport'])) {
        $args[] = '--transport';
        $args[] = $validated['transport'];
    }

    if (!empty($validated['dest_id'])) {
        $args[] = '--dest_id';
        $args[] = $validated['dest_id'];
    }

    $process = new Process($args);
    $process->setWorkingDirectory($this->workingDir());
    $process->setEnv([
        'OPENBLAS_NUM_THREADS' => '1',
        'MKL_NUM_THREADS' => '1',
        'OMP_NUM_THREADS' => '1',
        'NUMEXPR_NUM_THREADS' => '1',
        'VECLIB_MAXIMUM_THREADS' => '1',
    ]);
    $process->setTimeout(120);

    try {
        $process->mustRun();
        $output = $process->getOutput();
        $result = json_decode($output, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'Output bukan JSON valid'], 500);
        }
        return response()->json($result);

    } catch (ProcessFailedException $e) {
        return response()->json([
            'error' => 'Proses gagal.',
            'detail' => $e->getProcess()->getErrorOutput(),
        ], 500);
    }
}

    /**
     * API: Cari kandidat destinasi tambahan untuk fitur multi-destinasi per hari.
     * Dipanggil oleh recom.js saat user klik "+ Tambah Destinasi"
     */
    public function addDestination(Request $request)
    {
        $validated = $request->validate([
            'lat'              => 'required|numeric',
            'lon'              => 'required|numeric',
            'budget_remaining' => 'required|numeric|min:0',
            'persons'          => 'required|integer|min:1|max:20',
            'existing_ids'     => 'nullable|string',
            'max_results'      => 'nullable|integer|min:1|max:30',
            'max_dist_km'      => 'nullable|numeric|min:1|max:100',
        ]);

        $python = $this->pythonBinary();
        $script = storage_path('app/python/add_destination_api.py');

        $cmd = [
            $python, $script,
            '--lat',              (string) $validated['lat'],
            '--lon',              (string) $validated['lon'],
            '--budget_remaining', (string) $validated['budget_remaining'],
            '--persons',          (string) $validated['persons'],
        ];

        if (!empty($validated['existing_ids'])) {
            $cmd[] = '--existing_ids';
            $cmd[] = $validated['existing_ids'];
        }
        if (!empty($validated['max_results'])) {
            $cmd[] = '--max_results';
            $cmd[] = (string) $validated['max_results'];
        }
        if (!empty($validated['max_dist_km'])) {
            $cmd[] = '--max_dist_km';
            $cmd[] = (string) $validated['max_dist_km'];
        }

        $process = new Process($cmd);
        $process->setWorkingDirectory($this->workingDir());
        $process->setEnv([
            'OPENBLAS_NUM_THREADS'    => '1',
            'MKL_NUM_THREADS'         => '1',
            'OMP_NUM_THREADS'         => '1',
            'NUMEXPR_NUM_THREADS'     => '1',
            'VECLIB_MAXIMUM_THREADS'  => '1',
        ]);
        $process->setTimeout(120);

        try {
            $process->mustRun();
            $output = $process->getOutput();
            $result = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['status' => 'error', 'message' => 'Output bukan JSON valid'], 500);
            }
            return response()->json($result);

        } catch (ProcessFailedException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Proses gagal.',
                'detail'  => $e->getProcess()->getErrorOutput(),
            ], 500);
        }
    }
}

