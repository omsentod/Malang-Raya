<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RecommenderController;

Route::get('/', function () {
    $featuredPath = storage_path('app/python/catalog_featured.json');
    if (!file_exists($featuredPath)) {
        try {
            $venv = storage_path('app/python/venv/bin/python');
            $python = file_exists($venv) ? $venv : 'python3';
            $process = new \Symfony\Component\Process\Process([$python, storage_path('app/python/get_catalog.py')]);
            $process->setWorkingDirectory(storage_path('app/python'));
            $process->run();
        } catch (\Exception $e) {
            // Silently fallback if python execution fails
        }
    }

    $catalog = [];
    if (file_exists($featuredPath)) {
        $catalog = json_decode(file_get_contents($featuredPath), true) ?? [];
    }

    return view('landing', compact('catalog'));
});

Route::get('/how-it-works', function () {
    return view('how-it-works');
});

Route::get('/dashboard', function () {
    return view('dashboard');
});

Route::get('/directory', function () {
    return view('directory');
})->name('directory');

// Recommender — halaman (GET) + API (POST)
Route::get('/recommender', [RecommenderController::class, 'index']);

$nocsrf = [\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class];
Route::post('/api/recommend',    [RecommenderController::class, 'calculate'])->withoutMiddleware($nocsrf);
Route::post('/api/how-it-works', [RecommenderController::class, 'runVisualization'])->withoutMiddleware($nocsrf);
