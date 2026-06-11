<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Panel Admin Malang Raya — Kelola dataset pariwisata, akomodasi, kuliner, dan manajemen hak akses pengguna." />
    <title>Panel Admin — Malang Raya Tourism</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <!-- Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />

    <!-- Core CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />

    <style>
        :root {
            --glass-bg: rgba(17, 24, 39, 0.6);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-highlight: rgba(255, 255, 255, 0.03);
            --neon-pink: #ec4899;
            --neon-purple: #8b5cf6;
            --neon-amber: #f59e0b;
            --neon-emerald: #10b981;
            --neon-blue: #3b82f6;
            --text-muted: #9ca3af;
        }

        body {
            font-family: 'Manrope', 'Inter', sans-serif;
            background-color: #030712;
            color: #f3f4f6;
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* Background blur blobs */
        .blur-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(120px);
            opacity: 0.15;
            z-index: 0;
            pointer-events: none;
        }
        .blob-1 {
            top: 10%;
            left: 5%;
            width: 350px;
            height: 350px;
            background: var(--neon-pink);
        }
        .blob-2 {
            top: 40%;
            right: 10%;
            width: 400px;
            height: 400px;
            background: var(--neon-purple);
        }
        .blob-3 {
            bottom: 10%;
            left: 20%;
            width: 300px;
            height: 300px;
            background: var(--neon-amber);
        }

        .admin-layout {
            position: relative;
            z-index: 1;
            max-width: 1280px;
            margin: 0 auto;
            padding: 100px 24px 60px;
        }

        /* Header Title */
        .admin-header {
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        .admin-header h1 {
            font-size: 2.2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #fff 30%, var(--text-muted) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 4px;
        }
        .admin-header p {
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 24px;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(20px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
        }
        .stat-card:hover {
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .stat-icon {
            font-size: 28px;
            padding: 10px;
            border-radius: 12px;
            display: inline-flex;
            margin-bottom: 16px;
        }
        .stat-card.wisata .stat-icon { background: rgba(236, 72, 153, 0.1); color: var(--neon-pink); }
        .stat-card.hotel .stat-icon { background: rgba(59, 130, 246, 0.1); color: var(--neon-blue); }
        .stat-card.kuliner .stat-icon { background: rgba(245, 158, 11, 0.1); color: var(--neon-amber); }
        .stat-card.users .stat-icon { background: rgba(139, 92, 246, 0.1); color: var(--neon-purple); }
        
        .stat-info .stat-value {
            font-size: 2rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 4px;
        }
        .stat-info .stat-label {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Content Grid */
        .content-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 30px;
        }
        @media (max-width: 1024px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Glass Cards */
        .glass-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(25px);
            margin-bottom: 30px;
        }
        .card-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.25rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .card-title span.material-symbols-outlined {
            font-size: 24px;
            color: var(--neon-purple);
        }

        /* Form styling */
        .form-group {
            margin-bottom: 20px;
        }
        .form-label {
            display: block;
            font-size: 0.9rem;
            font-weight: 600;
            color: #e5e7eb;
            margin-bottom: 8px;
        }
        .select-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            padding: 12px 16px;
            color: #fff;
            font-family: inherit;
            font-size: 0.95rem;
            outline: none;
            cursor: pointer;
            transition: border-color 0.2s;
        }
        .select-input:focus {
            border-color: var(--neon-purple);
        }

        /* Mode Selection Buttons */
        .mode-selection {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .mode-btn {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--glass-border);
            color: var(--text-muted);
            border-radius: 10px;
            padding: 14px;
            cursor: pointer;
            text-align: center;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        }
        .mode-btn span.mode-title {
            font-size: 0.95rem;
            color: #f3f4f6;
        }
        .mode-btn span.mode-desc {
            font-size: 0.75rem;
            font-weight: 400;
        }
        .mode-btn.active {
            border-color: var(--neon-purple);
            background: rgba(139, 92, 246, 0.1);
            color: var(--neon-purple);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.15);
        }
        .mode-btn.active span.mode-title {
            color: #c4b5fd;
        }

        /* Drag Drop Zone */
        .upload-zone {
            border: 2px dashed var(--glass-border);
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.01);
            transition: all 0.2s;
            position: relative;
        }
        .upload-zone:hover, .upload-zone.dragover {
            border-color: var(--neon-purple);
            background: rgba(139, 92, 246, 0.03);
        }
        .upload-icon {
            font-size: 44px;
            color: var(--text-muted);
            margin-bottom: 12px;
            transition: transform 0.2s;
        }
        .upload-zone:hover .upload-icon {
            transform: translateY(-4px);
            color: #c4b5fd;
        }
        .upload-text {
            font-size: 0.95rem;
            font-weight: 500;
            color: #e5e7eb;
            margin-bottom: 4px;
        }
        .upload-subtext {
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .file-input {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
        }
        .selected-file-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--neon-emerald);
            border-radius: 8px;
            padding: 8px 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            margin-top: 12px;
            font-weight: 600;
        }

        /* Action Buttons */
        .btn-action {
            width: 100%;
            border: none;
            outline: none;
            border-radius: 10px;
            padding: 14px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--neon-purple), #7c3aed);
            color: #fff;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }
        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--glass-border);
            color: #e5e7eb;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        /* System Tools Button layout */
        .system-tools-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
        }
        .tool-btn-wrap {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }
        .tool-info h4 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #f3f4f6;
            margin-bottom: 2px;
        }
        .tool-info p {
            font-size: 0.78rem;
            color: var(--text-muted);
        }
        .btn-tool {
            padding: 10px 16px;
            font-size: 0.85rem;
            width: auto;
            flex-shrink: 0;
        }

        /* Users Table styling */
        .table-responsive {
            overflow-x: auto;
            margin-top: 10px;
        }
        .admin-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
        }
        .admin-table th {
            color: var(--text-muted);
            font-weight: 600;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .admin-table td {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            color: #e5e7eb;
            vertical-align: middle;
        }
        .admin-table tr:hover td {
            background: rgba(255, 255, 255, 0.01);
        }
        .user-name-cell {
            font-weight: 600;
            color: #fff;
        }
        .role-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            text-transform: uppercase;
        }
        .role-badge.admin {
            background: rgba(239, 68, 68, 0.1);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .role-badge.user {
            background: rgba(59, 130, 246, 0.1);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .role-selector {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--glass-border);
            border-radius: 6px;
            color: #fff;
            padding: 4px 8px;
            font-size: 0.85rem;
            outline: none;
            cursor: pointer;
        }
        .role-selector:focus {
            border-color: var(--neon-purple);
        }

        /* Export backup items */
        .export-downloads-card {
            margin-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 20px;
        }
        .export-downloads-card p {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 12px;
        }
        .export-btn-group {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .export-dl-btn {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--glass-border);
            color: #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .export-dl-btn:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.3);
            color: #c4b5fd;
        }

        /* TOAST SYSTEM */
        .toast-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 9999;
        }
        .toast {
            background: rgba(17, 24, 39, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-left: 4px solid var(--neon-purple);
            border-radius: 10px;
            padding: 16px 20px;
            min-width: 300px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 12px;
            color: #f3f4f6;
            font-size: 0.9rem;
            transform: translateY(50px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        .toast.success { border-left-color: var(--neon-emerald); }
        .toast.error { border-left-color: #ef4444; }
        .toast-icon { font-size: 20px; }
        .toast.success .toast-icon { color: var(--neon-emerald); }
        .toast.error .toast-icon { color: #ef4444; }

        /* Loader Animations */
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: inline-block;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    @include('preloader')

    <!-- Background decorative blobs -->
    <div class="blur-blob blob-1"></div>
    <div class="blur-blob blob-2"></div>
    <div class="blur-blob blob-3"></div>

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar dark" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/directory">Directory</a>
                </div>
                <div class="g-nav-right">
                    <button class="g-nav-bookmark-btn" id="nav-bookmark-btn" title="Rencana Perjalanan Saya">
                        <span class="material-symbols-outlined">bookmarks</span>
                        <span class="bookmark-label">Rencana Saya</span>
                        <span class="bookmark-badge" id="bookmark-badge-count">0</span>
                    </button>
                    <div id="nav-profile-container" style="display: flex; align-items: center;"></div>
                    <button class="g-nav-hamburger" id="hamburger-btn">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </nav>
        <div class="g-mobile-menu" id="mobile-menu">
            <a class="g-mobile-link" href="/">Home</a>
            <a class="g-mobile-link" href="/recommender">Explore</a>
            <a class="g-mobile-link" href="/how-it-works">How It Works</a>
            <a class="g-mobile-link" href="/directory">Directory</a>
        </div>
    </div>

    <!-- ===================== TOAST CONTAINER ===================== -->
    <div class="toast-container" id="toast-container"></div>

    <!-- ===================== DASHBOARD LAYOUT ===================== -->
    <main class="admin-layout">
        
        <!-- Header -->
        <header class="admin-header">
            <div>
                <h1>Panel Administrasi Sistem</h1>
                <p>Kelola data sumber excel pariwisata, akomodasi, dan sinkronisasi mesin FCM.</p>
            </div>
            <div>
                <a href="/dashboard" class="btn-action btn-secondary" style="padding: 10px 18px; border-radius: 8px; font-size: 0.88rem; text-decoration: none;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                    Ke Dashboard Akun
                </a>
            </div>
        </header>

        <!-- Stats Overview Cards -->
        <section class="stats-grid">
            <div class="stat-card wisata">
                <span class="material-symbols-outlined stat-icon">landscape</span>
                <div class="stat-info">
                    <div class="stat-value" id="stats-wisata">--</div>
                    <div class="stat-label">Destinasi Wisata</div>
                </div>
            </div>
            <div class="stat-card hotel">
                <span class="material-symbols-outlined stat-icon">hotel</span>
                <div class="stat-info">
                    <div class="stat-value" id="stats-hotel">--</div>
                    <div class="stat-label">Akomodasi Hotel</div>
                </div>
            </div>
            <div class="stat-card kuliner">
                <span class="material-symbols-outlined stat-icon">restaurant</span>
                <div class="stat-info">
                    <div class="stat-value" id="stats-kuliner">--</div>
                    <div class="stat-label">Tempat Makan</div>
                </div>
            </div>
            <div class="stat-card users">
                <span class="material-symbols-outlined stat-icon">group</span>
                <div class="stat-info">
                    <div class="stat-value" id="stats-users">--</div>
                    <div class="stat-label">Pengguna Terdaftar</div>
                </div>
            </div>
        </section>

        <!-- Main Workspace Columns -->
        <div class="content-grid">
            
            <!-- COLUMN LEFT: Importer -->
            <section class="workspace-main">
                <div class="glass-card">
                    <div class="card-title">
                        <span class="material-symbols-outlined" style="color: var(--neon-blue);">cloud_upload</span>
                        <h2>Import Dataset Excel</h2>
                    </div>

                    <form id="excel-import-form">
                        <div class="form-group">
                            <label class="form-label">1. Pilih Kategori Dataset</label>
                            <select class="select-input" name="type" id="import-type" required>
                                <option value="wisata">Destinasi Wisata (wisata_clean.xlsx)</option>
                                <option value="hotel">Akomodasi Hotel (hotel_clean.xlsx)</option>
                                <option value="kuliner">Kuliner & Tempat Makan (tempat_makan_clean.xlsx)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">2. Pilih Mode Impor Data</label>
                            <div class="mode-selection">
                                <button type="button" class="mode-btn active" id="mode-append-btn">
                                    <span class="material-symbols-outlined" style="font-size: 22px;">playlist_add</span>
                                    <span class="mode-title">Tambahkan (Append)</span>
                                    <span class="mode-desc">Menyisipkan baris baru. Duplikasi ID otomatis disaring.</span>
                                </button>
                                <button type="button" class="mode-btn" id="mode-replace-btn">
                                    <span class="material-symbols-outlined" style="font-size: 22px;">swap_calls</span>
                                    <span class="mode-title">Timpa (Replace)</span>
                                    <span class="mode-desc">Mengganti seluruh isi dataset dengan data berkas baru.</span>
                                </button>
                            </div>
                            <input type="hidden" name="mode" id="import-mode-input" value="append" />
                        </div>

                        <div class="form-group" style="margin-top: 24px;">
                            <label class="form-label">3. Unggah Berkas Excel (.xlsx, .xls)</label>
                            <div class="upload-zone" id="drop-zone">
                                <span class="material-symbols-outlined upload-icon" id="drop-icon">upload_file</span>
                                <div class="upload-text" id="drop-text">Seret & Taruh berkas Excel di sini, atau klik untuk memilih</div>
                                <div class="upload-subtext">Pastikan headers kolom sudah sesuai dengan template tabel data.</div>
                                <input type="file" class="file-input" name="file" id="file-selector" accept=".xlsx, .xls" required />
                            </div>
                            <div id="file-badge-container" style="display: none; text-align: center;">
                                <div class="selected-file-badge">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                                    <span id="selected-file-name">file_name.xlsx</span>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 30px;">
                            <button type="submit" class="btn-action btn-primary" id="submit-import-btn">
                                <span class="material-symbols-outlined">publish</span>
                                <span>Proses dan Integrasikan Data</span>
                            </button>
                        </div>
                    </form>

                    <!-- Export downloads Section -->
                    <div class="export-downloads-card">
                        <p>Ekspor/Backup Dataset Aktif saat ini:</p>
                        <div class="export-btn-group">
                            <a href="/api/admin/export/wisata" class="export-dl-btn">
                                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                                <span>Wisata</span>
                            </a>
                            <a href="/api/admin/export/hotel" class="export-dl-btn">
                                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                                <span>Hotel</span>
                            </a>
                            <a href="/api/admin/export/kuliner" class="export-dl-btn">
                                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                                <span>Kuliner</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- COLUMN RIGHT: Maintenance & User Role Manager -->
            <aside class="workspace-sidebar">
                
                <!-- System Tools Card -->
                <div class="glass-card">
                    <div class="card-title">
                        <span class="material-symbols-outlined" style="color: var(--neon-amber);">build</span>
                        <h2>Utilitas Pemeliharaan</h2>
                    </div>

                    <div class="system-tools-grid">
                        <div class="tool-btn-wrap">
                            <div class="tool-info">
                                <h4>Membangun Ulang Cache</h4>
                                <p>Menjalankan get_catalog.py untuk update autocomplete & featured homepage.</p>
                            </div>
                            <button class="btn-action btn-secondary btn-tool" id="btn-rebuild-catalog">
                                <span class="material-symbols-outlined" style="font-size: 16px;">sync</span>
                                <span>Rebuild</span>
                            </button>
                        </div>

                        <div class="tool-btn-wrap">
                            <div class="tool-info">
                                <h4>Bersihkan Cache PHP</h4>
                                <p>Menghapus cache memory list dropdown pariwisata Laravel.</p>
                            </div>
                            <button class="btn-action btn-secondary btn-tool" id="btn-clear-cache">
                                <span class="material-symbols-outlined" style="font-size: 16px;">delete_sweep</span>
                                <span>Clear Cache</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- User Manager Card -->
                <div class="glass-card">
                    <div class="card-title">
                        <span class="material-symbols-outlined" style="color: var(--neon-pink);">admin_panel_settings</span>
                        <h2>Manajer Akses Pengguna</h2>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Nama / Email</th>
                                    <th>Peran (Role)</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                <tr>
                                    <td colspan="2" style="text-align: center; color: var(--text-muted); padding: 20px;">
                                        Memuat daftar pengguna...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <!-- Scripts -->
    <script src="{{ asset('assets/js/global-auth.js') }}"></script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Drop zone elements
            const dropZone = document.getElementById('drop-zone');
            const fileSelector = document.getElementById('file-selector');
            const fileBadgeContainer = document.getElementById('file-badge-container');
            const selectedFileName = document.getElementById('selected-file-name');
            const dropIcon = document.getElementById('drop-icon');
            const dropText = document.getElementById('drop-text');

            // Import modes
            const modeAppendBtn = document.getElementById('mode-append-btn');
            const modeReplaceBtn = document.getElementById('mode-replace-btn');
            const importModeInput = document.getElementById('import-mode-input');

            // System buttons
            const btnRebuildCatalog = document.getElementById('btn-rebuild-catalog');
            const btnClearCache = document.getElementById('btn-clear-cache');

            // 1. Toast Notification Helper
            function triggerToast(message, type = 'success') {
                const toastContainer = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                
                const icon = type === 'success' ? 'check_circle' : 'error';
                toast.innerHTML = `
                    <span class="material-symbols-outlined toast-icon">${icon}</span>
                    <span>${message}</span>
                `;
                
                toastContainer.appendChild(toast);
                
                // Show animation
                setTimeout(() => toast.classList.add('show'), 50);
                
                // Remove after 4 seconds
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 300);
                }, 4000);
            }

            // 2. Fetch Stats
            function loadStats() {
                fetch('/api/admin/stats')
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById('stats-wisata').textContent = data.stats.wisata_count;
                            document.getElementById('stats-hotel').textContent = data.stats.hotel_count;
                            document.getElementById('stats-kuliner').textContent = data.stats.kuliner_count;
                            document.getElementById('stats-users').textContent = data.stats.user_count;
                        }
                    })
                    .catch(err => console.error('Gagal mengambil data statistik:', err));
            }

            // 3. Fetch Users
            function loadUsers() {
                fetch('/api/admin/users')
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            const tbody = document.getElementById('users-table-body');
                            tbody.innerHTML = '';

                            if (data.users.length === 0) {
                                tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">Tidak ada pengguna terdaftar</td></tr>`;
                                return;
                            }

                            data.users.forEach(user => {
                                const currentUserId = window.currentUser ? window.currentUser.id : null;
                                const isSelf = user.id == currentUserId;
                                
                                tbody.innerHTML += `
                                    <tr>
                                        <td>
                                            <div class="user-name-cell">${escapeHtml(user.name)}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(user.email)}</div>
                                        </td>
                                        <td>
                                            <select class="role-selector" onchange="changeUserRole(${user.id}, this.value)" ${isSelf ? 'disabled title="Anda tidak dapat mengubah peran Anda sendiri"' : ''}>
                                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                `;
                            });
                        }
                    })
                    .catch(err => console.error('Gagal mengambil daftar pengguna:', err));
            }

            // Global role changer callback
            window.changeUserRole = function(userId, newRole) {
                fetch(`/api/admin/users/${userId}/role`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({ role: newRole })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        triggerToast(data.message, 'success');
                        loadStats();
                    } else {
                        triggerToast(data.message || 'Gagal mengubah peran.', 'error');
                        loadUsers(); // revert
                    }
                })
                .catch(err => {
                    console.error('Error updating role:', err);
                    triggerToast('Kesalahan koneksi ke server.', 'error');
                    loadUsers(); // revert
                });
            };

            // 4. Mode Buttons Interaction
            modeAppendBtn.addEventListener('click', () => {
                modeAppendBtn.classList.add('active');
                modeReplaceBtn.classList.remove('active');
                importModeInput.value = 'append';
            });
            modeReplaceBtn.addEventListener('click', () => {
                // Warning dialog for overwrite
                const confirmOverwrite = confirm("PERINGATAN: Mode Replace (Timpa) akan menghapus seluruh data pada dataset pariwisata kategori terpilih dan menggantinya dengan isi berkas Excel yang baru. Apakah Anda yakin?");
                if (confirmOverwrite) {
                    modeReplaceBtn.classList.add('active');
                    modeAppendBtn.classList.remove('active');
                    importModeInput.value = 'replace';
                }
            });

            // 5. Drag & Drop File Upload Interactions
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                if (e.dataTransfer.files.length) {
                    fileSelector.files = e.dataTransfer.files;
                    handleFileSelection(e.dataTransfer.files[0]);
                }
            });
            fileSelector.addEventListener('change', () => {
                if (fileSelector.files.length) {
                    handleFileSelection(fileSelector.files[0]);
                }
            });

            function handleFileSelection(file) {
                // Verify extension
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext !== 'xlsx' && ext !== 'xls') {
                    triggerToast("Tipe file tidak didukung! Unggah berkas format Excel saja (.xlsx, .xls).", "error");
                    fileSelector.value = '';
                    fileBadgeContainer.style.display = 'none';
                    return;
                }

                selectedFileName.textContent = file.name + ` (${(file.size / 1024).toFixed(1)} KB)`;
                fileBadgeContainer.style.display = 'block';
                dropIcon.textContent = 'check_circle';
                dropIcon.style.color = 'var(--neon-emerald)';
                dropText.textContent = 'Berkas Excel berhasil dimuat!';
            }

            // 6. Submit Import Form (AJAX)
            const importForm = document.getElementById('excel-import-form');
            const submitBtn = document.getElementById('submit-import-btn');

            importForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const formData = new FormData(importForm);
                
                // Show loader state
                submitBtn.disabled = true;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = `<span class="spinner"></span> <span>Memproses Integrasi Excel...</span>`;

                fetch('/api/admin/import', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: formData
                })
                .then(async res => {
                    const data = await res.json();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;

                    if (res.ok && data.success) {
                        triggerToast(data.message, 'success');
                        
                        // Reset form & badge UI
                        importForm.reset();
                        fileBadgeContainer.style.display = 'none';
                        dropIcon.textContent = 'upload_file';
                        dropIcon.style.color = '';
                        dropText.textContent = 'Seret & Taruh berkas Excel di sini, atau klik untuk memilih';
                        
                        // Reload data
                        loadStats();
                    } else {
                        triggerToast(data.message || 'Gagal memproses file Excel.', 'error');
                    }
                })
                .catch(err => {
                    console.error('Import error:', err);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    triggerToast('Terjadi kesalahan koneksi server saat impor berkas.', 'error');
                });
            });

            // 7. System Maintenance Buttons (AJAX)
            btnRebuildCatalog.addEventListener('click', () => {
                btnRebuildCatalog.disabled = true;
                const originalContent = btnRebuildCatalog.innerHTML;
                btnRebuildCatalog.innerHTML = `<span class="spinner"></span> <span>Running...</span>`;

                fetch('/api/admin/rebuild-catalog', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    }
                })
                .then(async res => {
                    const data = await res.json();
                    btnRebuildCatalog.disabled = false;
                    btnRebuildCatalog.innerHTML = originalContent;

                    if (res.ok && data.success) {
                        triggerToast(data.message, 'success');
                    } else {
                        triggerToast(data.message || 'Gagal menjalankan rebuild cache.', 'error');
                    }
                })
                .catch(err => {
                    console.error('Error rebuilding catalog:', err);
                    btnRebuildCatalog.disabled = false;
                    btnRebuildCatalog.innerHTML = originalContent;
                    triggerToast('Gagal terhubung dengan server.', 'error');
                });
            });

            btnClearCache.addEventListener('click', () => {
                btnClearCache.disabled = true;
                const originalContent = btnClearCache.innerHTML;
                btnClearCache.innerHTML = `<span class="spinner"></span> <span>Running...</span>`;

                fetch('/api/admin/clear-cache', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    }
                })
                .then(async res => {
                    const data = await res.json();
                    btnClearCache.disabled = false;
                    btnClearCache.innerHTML = originalContent;

                    if (res.ok && data.success) {
                        triggerToast(data.message, 'success');
                    } else {
                        triggerToast(data.message || 'Gagal membersihkan cache Laravel.', 'error');
                    }
                })
                .catch(err => {
                    console.error('Error clearing cache:', err);
                    btnClearCache.disabled = false;
                    btnClearCache.innerHTML = originalContent;
                    triggerToast('Kesalahan koneksi ke server.', 'error');
                });
            });

            // Helpers
            function escapeHtml(str) {
                if (str === null || str === undefined) return '';
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            }

            // Init Load
            loadStats();
            loadUsers();
        });
    </script>
</body>
</html>
