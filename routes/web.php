<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RecommenderController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;

Route::get('/', function () {
    $featuredPath = storage_path('app/python/catalog_featured.json');
    $fallbackPath = resource_path('data/catalog_featured.json');

    // If storage file doesn't exist but fallback exists, copy it as a starting baseline
    if (!file_exists($featuredPath) && file_exists($fallbackPath)) {
        try {
            @mkdir(dirname($featuredPath), 0755, true);
            @copy($fallbackPath, $featuredPath);
        } catch (\Exception $e) {
            // Silently handle write issues on hosting
        }
    }

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

    // Ultimate fallback to committed resource file if storage is still missing or failed to decode
    if (empty($catalog) && file_exists($fallbackPath)) {
        $catalog = json_decode(file_get_contents($fallbackPath), true) ?? [];
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
Route::post('/api/recommend',        [RecommenderController::class, 'calculate'])->withoutMiddleware($nocsrf);
Route::post('/api/how-it-works',     [RecommenderController::class, 'runVisualization'])->withoutMiddleware($nocsrf);
Route::post('/api/min-budget',       [RecommenderController::class, 'minBudget'])->withoutMiddleware($nocsrf);
Route::post('/api/add-destination',  [RecommenderController::class, 'addDestination'])->withoutMiddleware($nocsrf);


// Auth API (AJAX)
Route::post('/api/auth/login', [AuthController::class, 'ajaxLogin']);
Route::post('/api/auth/register', [AuthController::class, 'ajaxRegister']);
Route::post('/api/auth/logout', [AuthController::class, 'ajaxLogout']);
Route::get('/api/auth/status', [AuthController::class, 'checkAuthStatus']);



// Profile API (Protected)
Route::middleware('auth')->group(function () {
    Route::post('/api/profile/update', [AuthController::class, 'ajaxUpdateProfile']);
});

// Admin Panel Routing (Protected by auth and admin middleware)
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin', [AdminController::class, 'index']);
    
    // Admin API endpoints
    Route::get('/api/admin/stats', [AdminController::class, 'getStats']);
    Route::get('/api/admin/export/{type}', [AdminController::class, 'exportExcel']);
    Route::post('/api/admin/import', [AdminController::class, 'importExcel']);
    Route::post('/api/admin/rebuild-catalog', [AdminController::class, 'rebuildCatalog']);
    Route::post('/api/admin/clear-cache', [AdminController::class, 'clearCache']);
    
    // User role management
    Route::get('/api/admin/users', [AdminController::class, 'getUsers']);
    Route::post('/api/admin/users/{id}/role', [AdminController::class, 'updateUserRole']);
});


