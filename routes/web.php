<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RecommenderController;

Route::get('/', function () {
    return view('landing');
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
