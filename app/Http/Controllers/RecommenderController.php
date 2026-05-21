<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class RecommenderController extends Controller
{
    private function pythonBinary(): string
    {
        $venv = storage_path('app/python/venv/bin/python');
        return file_exists($venv) ? $venv : 'python3';
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

    /**
     * API: Jalankan algoritma rekomendasi (Budget / Flexible / Destination)
     */
    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'workflow'  => 'required|in:budget,flexible,destination',
            'persons'   => 'required|integer|min:1|max:20',
            'duration'  => 'required|integer|min:1|max:30',
            'budget'    => 'nullable|numeric|min:0',
            'dest_id'   => 'nullable|string',
            'transport' => 'nullable|string',
        ]);

        $args = [
            $this->pythonBinary(),
            storage_path('app/python/recommender_api.py'),
            '--workflow', $validated['workflow'],
            '--persons',  $validated['persons'],
            '--duration', $validated['duration'],
        ];

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

        $process = new Process($args);
        $process->setWorkingDirectory($this->workingDir());
        $process->setTimeout(90);

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
        $args = [
            $this->pythonBinary(),
            '-c',
            'import pandas as pd, json; df=pd.read_excel("wisata.xlsx"); print(json.dumps(df[["Id_Tempat","Nama_Tempat"]].to_dict("records"), ensure_ascii=False))'
        ];
        $process = new Process($args);
        $process->setWorkingDirectory($this->workingDir());
        $process->setTimeout(30);
        try {
            $process->mustRun();
            return json_decode($process->getOutput(), true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }
}
