<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Dashboard wisata Malang Raya — lihat destinasi tersimpan, rekomendasi FCM, dan alokasi budget perjalanan Anda." />
    <title>Saved — Malang Raya Tourism</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-3.css') }}?v={{ time() }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-3.js') }}?v={{ time() }}" defer></script>
</head>
<body>

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/directory">Directory</a>
                </div>
                <div class="g-nav-right">
                    <div class="g-nav-search">
                        <span class="material-symbols-outlined g-nav-search-icon">search</span>
                        <input type="text" placeholder="Cari destinasi..." />
                    </div>
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

    <!-- ===================== PLACE DETAILS ===================== -->
    <section class="place-section" id="place-details-section" style="display: none;">
        <div class="place-container">

            <!-- Gallery Bento -->
            <div class="gallery-bento reveal">
                <div class="gallery-main">
                    <img class="gallery-img" alt="The Shalimar Boutique Hotel" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBckI6diUlpeCn1s-3qGDyJX04VHUXOxifrW1Eb03rN7p3U2yNkrdDMXQOAFYw3KjNGqEX0TImv4dnCAFv8LSjaCqhtpqEmNjEDzrB50WeVFfUHkJw7mBsJivdUmbH7M0_u3M-JHUn4LFhn4pOApkHxjdOFbGNuosTJu2N_gh5lUi0CIdo1y-rt9O9LNriikcX2vzY5UMAZjaoUP0eruSPHOHFwZYev_4IenNnNk81LZi2_LDnV6ogNgb1_yLZn2365CPOgTtx28Ic" />
                    <div class="gallery-grad"></div>
                    <div class="gallery-info">
                        <span class="gallery-badge">Premium Destination</span>
                        <h1 class="gallery-title">The Shalimar Boutique Hotel</h1>
                        <p class="gallery-loc">
                            <span class="material-symbols-outlined" style="font-size:1rem;">location_on</span>
                            Jalan Cerme No. 16, Oro-oro Dowo, Malang
                        </p>
                    </div>
                </div>
                <div class="gallery-side">
                    <div class="gallery-sub">
                        <img class="gallery-img" alt="Hotel room" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA46axdjzLzVVykIZ_wa3jUOKEGrXtiPOab_-0dwL4Afy3vmej3i55cPq-TY8PlZh8ydQuwhbBl1Wiyipk6jbVd9jrKsc--El5W_YN8OrFayUZP88wFTnNf-qbUthG9iDKeiHGh-39H4F4Xyp4h7LSCpVXeZ9rWgzbcS6t8j_TeP1rlBrBXfuX1y2fB4xVFtSiWWTvYZDH0XHfIEIzTapKIenBdeJwie9l-rdUl5M-D0E7DIAen2LBkUkMmYBbiYn3-ryonTHXKkIQ" />
                    </div>
                    <div class="gallery-sub">
                        <img class="gallery-img" alt="Hotel pool" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhGQ8CY2Mzn37qGQKGs6qYXLQ6hoynRxDFVRlANKPKWKaXFCTYdpxCrYtLJFspq0qZivWtR8vsxy0CwcsoLcxyUISv7_az6Iu6SpBKwcWLdysH-QeHeuPjRGAdTcE3IuRmw8vBdxyqZzJwCfJ2gNgZKFYOIs-dErdCFQuT0Q_o687dT7GYiTZIqsC_wwctDSbquBoIneslLuU_-ZXM3iiYxOnPcZf_J4Fx-jwDXfxDrwYDtYr9hNsdS_EzjXaJkg1Vz9bNmVrNEfM" />
                        <div class="gallery-more-overlay">
                            <span>+12 Photos</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Content Layout -->
            <div class="content-layout reveal reveal-delay-1">

                <!-- Main Details -->
                <div class="content-main">
                    <div class="place-about">
                        <h2 class="content-section-title">About the Experience</h2>
                        <p class="content-section-desc">
                            Immerse yourself in the grandeur of the colonial era at The Shalimar Boutique Hotel. Originally built in the 1930s, this heritage landmark has been meticulously preserved to offer a blend of historical charm and modern luxury. Known for its academic architectural prestige and curated hospitality, it serves as the crown jewel of Malang's historical district.
                        </p>
                    </div>

                    <!-- Amenities -->
                    <div class="amenities-grid">
                        <div class="amenity-card">
                            <span class="material-symbols-outlined amenity-icon">wifi</span>
                            <p class="amenity-label">Free Wi-Fi</p>
                        </div>
                        <div class="amenity-card">
                            <span class="material-symbols-outlined amenity-icon">pool</span>
                            <p class="amenity-label">Pool</p>
                        </div>
                        <div class="amenity-card">
                            <span class="material-symbols-outlined amenity-icon">spa</span>
                            <p class="amenity-label">Luxury Spa</p>
                        </div>
                        <div class="amenity-card">
                            <span class="material-symbols-outlined amenity-icon">restaurant</span>
                            <p class="amenity-label">Fine Dining</p>
                        </div>
                    </div>

                    <!-- Map -->
                    <div class="location-wrap">
                        <h3 class="content-subsection-title">Lokasi</h3>
                        <div class="location-map">
                            <img class="map-img" alt="Map view" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz_EXD50prMmZw3k6MfQL1PAMbAA6W7WWrKgITTp-w8QrrstHcTgs5O2MTyUcVy9sBK9OwxKuJiWlfP4Tsc4ORcB8FgX_8nX8OCB9G-bBwkQEY38-bMz09Njp_oBubLk0YXwyPbmf9UrLmREBL32riMs8buOpGRqX6dTiZcSZLTMf1oN5NDHixrVRt7N91TCZ1SQMNbNFYt582mhsFNRBTEI16HkFuD_AkLs7GBzkmpWp9CfO3IDDTolDIQ5TRSMgiWnYp4UelUAA" />
                        </div>
                    </div>
                </div>

                <!-- Booking Sidebar -->
                <div class="content-sidebar">
                    <div class="booking-card sticky-card">
                        <div class="booking-top">
                            <div>
                                <span class="price-hint">Starting from</span>
                                <div class="price-row">
                                    <span class="price-val">IDR 2.450k</span>
                                    <span class="price-unit">/malam</span>
                                </div>
                            </div>
                            <div class="booking-rating">
                                <span class="material-symbols-outlined star-icon">star</span>
                                <span class="rating-num">4.9</span>
                                <span class="rating-count">(128)</span>
                            </div>
                        </div>

                        <div class="booking-actions">
                            <button class="btn-book">
                                <span class="material-symbols-outlined">map</span>
                                Open Google Maps
                            </button>
                            <a href="#" class="btn-save" id="bento-package-btn" style="display: none; text-decoration: none; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                                <span class="material-symbols-outlined">auto_awesome</span>
                                Buat Paket Wisata
                            </a>
                        </div>

                        <div class="ai-suggestion">
                            <div class="ai-icon-wrap">
                                <span class="material-symbols-outlined">auto_awesome</span>
                            </div>
                            <p class="ai-text">
                                Sistem FCM menyarankan kunjungan saat <strong>Golden Hour (16:30)</strong> untuk pengalaman teh terbaik di teras bersejarah.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===================== DASHBOARD ===================== -->
    <section class="dash-section">
        <!-- Guest State -->
        <div class="dash-container" id="dashboard-guest-state" style="display: none;">
            <div class="guest-panel animate-reveal">
                <span class="material-symbols-outlined guest-icon">account_circle</span>
                <h2 class="guest-title">Akses Terbatas</h2>
                <p class="guest-desc">Silakan masuk atau daftarkan akun Anda terlebih dahulu untuk melihat dashboard aktivitas kustom, menulis catatan perjalanan, dan mengelola profil petualang Malang Raya Anda.</p>
                <button class="btn-guest-login" onclick="document.getElementById('auth-modal-overlay').classList.add('open');">Masuk ke Akun Saya</button>
            </div>
        </div>

        <!-- Logged In Dashboard -->
        <div class="dash-container" id="dashboard-logged-in-state" style="display: none;">

            <!-- Dashboard Header -->
            <header class="dash-header reveal">
                <div class="dash-profile">
                    <div class="dash-avatar-wrap">
                        <img class="dash-profile-img" id="dash-profile-avatar" alt="Profile" src="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" />
                        <div class="dash-status-dot"></div>
                    </div>
                    <div>
                        <p class="dash-greeting" id="dash-greeting-text">Welcome back,</p>
                        <h2 class="dash-name" id="dash-profile-name">User</h2>
                        <p class="dash-role" id="dash-profile-bio">
                            Loading your adventurer bio...
                        </p>
                    </div>
                </div>
                <div class="dash-stats-row">
                    <div class="dash-stat-pill">
                        <span class="dash-stat-label">Trip Points</span>
                        <span class="dash-stat-val" id="dash-points-val">0</span>
                    </div>
                    <div class="dash-stat-pill">
                        <span class="dash-stat-label">Active Plans</span>
                        <span class="dash-stat-val" id="dash-plans-val">0</span>
                    </div>
                </div>
            </header>

            <!-- Dashboard Tabs Navigation -->
            <div class="dash-tabs-nav reveal">
                <button class="dash-tab-btn active" data-tab="tab-saved">
                    <span class="material-symbols-outlined">favorite</span>
                    <span>Destinasi & Budget</span>
                </button>
                <button class="dash-tab-btn" data-tab="tab-notes">
                    <span class="material-symbols-outlined">assignment</span>
                    <span>Catatan Perjalanan</span>
                </button>
                <button class="dash-tab-btn" data-tab="tab-profile">
                    <span class="material-symbols-outlined">manage_accounts</span>
                    <span>Edit Profil</span>
                </button>
            </div>

            <!-- Tab 1 Panel: Saved Destinations -->
            <div class="dash-tab-panel-content" id="tab-saved" style="display: block;">
                <div class="dash-layout">
                <!-- Main -->
                <div class="dash-main">

                    <!-- Saved Destinations -->
                    <div class="saved-section reveal">
                        <div class="saved-header">
                            <h3 class="saved-title">Destinasi Tersimpan</h3>
                            <a class="link-view-all" href="#">
                                Lihat semua
                                <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span>
                            </a>
                        </div>
                        <div class="saved-grid" id="saved-places-grid">
                            <div class="saved-card">
                                <img class="saved-img" alt="Bromo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVaNEszJuD9BPaw-6ZNUZ8bF3kddFP3uY5bYtMggIeUsA948ziuMoZ4agiRwOCc9OLM5QuWv27aeOmLthubH8zjZDm8lbfFyo5lQO7RNXZCBNz7MRvFoTPW7dce9pmUX6he4SWq-4cfNpQrxwDUa1c5-Eya_edzJcNFWIdWDqs5HFnYesaakGMnVEfY7euiVJrHutsUhEqY9dDbD-xkH3Mc-PTMLAq34QDdOipGhsndemVHqUN0Hv6jQzc25K2K8D9ZxeHhGJc" />
                                <div class="saved-overlay"></div>
                                <div class="saved-info">
                                    <span class="saved-tag">Nature</span>
                                    <h4 class="saved-name">Mount Bromo Sunrise</h4>
                                    <p class="saved-loc">Kabupaten Malang</p>
                                </div>
                                <button class="saved-bookmark active">
                                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">bookmark</span>
                                </button>
                            </div>
                            <div class="saved-card">
                                <img class="saved-img" alt="Batu" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZ6R1ZhKiCT615ymHsOcJkjvW5gyHi3HlcAXFFCtshayfaJcEC1DSt4TvEBntOblySHjQJjyWASuNy_Pg1yL4Ves_0V_TMWSEGuCtxoaO8wepBMndU6DjCxOanuE4yYs5TAnYEe4Tcur6Ca6AKRGveb_OmJlmdVA9WSYDh2ySm8mUdRCarcIZdk4YirSbton9AAlrCRG4ERrIFIEFX6s430su87AjwA4OkabrNQHNpOQR8-_iVYVLv5RHtclDDN2j5uC4iIt5afFE" />
                                <div class="saved-overlay"></div>
                                <div class="saved-info">
                                    <span class="saved-tag">Scenic</span>
                                    <h4 class="saved-name">Batu Highland Retreat</h4>
                                    <p class="saved-loc">Kota Batu</p>
                                </div>
                                <button class="saved-bookmark active">
                                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">bookmark</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- AI Recommendation Box -->
                    <div class="rec-box reveal reveal-delay-1">
                        <div class="rec-glow"></div>
                        <div class="rec-inner">
                            <div class="rec-head">
                                <span class="material-symbols-outlined">psychology</span>
                                <span class="rec-label">FCM Recommendation Engine</span>
                            </div>
                            <h3 class="rec-title" id="rec-engine-title">
                                Karena Anda menyukai <span class="rec-highlight text-glow">The Shalimar</span>, kami sarankan:
                            </h3>
                            <div class="rec-scroll" id="rec-engine-cards">
                                <div class="rec-card">
                                    <img class="rec-img" alt="Melati Restaurant" src="/assets/GAMBAR/makan/Melati_Restaurant/Melati_Restaurant-1.jpg" />
                                    <div class="rec-card-info">
                                        <h4 class="rec-card-name">Melati Restaurant</h4>
                                        <p class="rec-card-desc">High-end Heritage Dining</p>
                                    </div>
                                </div>
                                <div class="rec-card">
                                    <img class="rec-img" alt="Tugu Hotel" src="/assets/GAMBAR/wisata/Alun_Alun_Tugu_Malang_-_Jan_Pieterszoon_Coen_Plein/Alun_Alun_Tugu_Malang_-_Jan_Pieterszoon_Coen_Plein-1.jpg" />
                                    <div class="rec-card-info">
                                        <h4 class="rec-card-name">Tugu Hotel Museum</h4>
                                        <p class="rec-card-desc">Cultural &amp; Historical Exploration</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="dash-sidebar">
                    <!-- Target Budget Tracker (Aktivitas Baru) -->
                    <div class="sidebar-widget reveal" style="margin-bottom: 20px;">
                        <h3 class="sidebar-widget-title" style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="color:var(--color-primary); font-size:18px;">payments</span>
                            Target Budget Perjalanan
                        </h3>
                        <div style="display:flex; gap:10px; margin-bottom:12px; margin-top:8px;">
                            <span style="font-size:15px; font-weight:800; color:var(--color-slate-400); align-self:center;">Rp</span>
                            <input type="number" id="target-budget-input" value="100000" style="flex:1; border:1.5px solid var(--color-slate-200); border-radius:10px; padding:8px 12px; font-size:14px; font-weight:800; outline:none; font-family:inherit;" />
                        </div>
                        <div class="budget-status-bar-wrap" style="height:8px; background:var(--color-slate-100); border-radius:4px; overflow:hidden; margin-bottom:10px;">
                            <div id="target-budget-fill" style="height:100%; width:0%; background:var(--color-primary); transition:width 0.3s ease;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:800;">
                            <span id="target-budget-current" style="color:var(--color-slate-500);">Terpakai: Rp 0</span>
                            <span id="target-budget-status" style="color:var(--color-primary);">0% Terpakai (Aman)</span>
                        </div>
                    </div>

                    <!-- Budget -->
                    <div class="sidebar-widget reveal">
                        <h3 class="sidebar-widget-title">Budget Allocation</h3>
                        <div class="budget-list">
                            <div class="budget-item" data-pct="40">
                                <div class="budget-label-row">
                                    <span>Akomodasi (40%)</span>
                                    <span class="budget-amount">Rp 12.000.000</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-primary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="25">
                                <div class="budget-label-row">
                                    <span>Kuliner (25%)</span>
                                    <span class="budget-amount">Rp 7.500.000</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-secondary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="20">
                                <div class="budget-label-row">
                                    <span>Eksplorasi (20%)</span>
                                    <span class="budget-amount">Rp 6.000.000</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-tertiary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="15">
                                <div class="budget-label-row">
                                    <span>Transport (15%)</span>
                                    <span class="budget-amount">Rp 4.500.000</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-muted" style="width:0"></div>
                                </div>
                            </div>
                        </div>
                        <div class="budget-total">
                            <span>Total Budget</span>
                            <span class="budget-total-val">Rp 30.000.000</span>
                        </div>
                    </div>

                    <!-- Recent Searches -->
                    <div class="sidebar-widget reveal reveal-delay-1">
                        <h3 class="sidebar-widget-title">Pencarian Terakhir</h3>
                        <ul class="recent-list">
                            <li class="recent-item">
                                <span class="material-symbols-outlined recent-icon">history</span>
                                <span>Tumpak Sewu Waterfall</span>
                            </li>
                            <li class="recent-item">
                                <span class="material-symbols-outlined recent-icon">history</span>
                                <span>Singosari Temple District</span>
                            </li>
                            <li class="recent-item">
                                <span class="material-symbols-outlined recent-icon">history</span>
                                <span>Batu Coffee Plantations</span>
                            </li>
                        </ul>
                    </div>
                </div>
                </div> <!-- Closes .dash-layout -->
            </div><!-- /#tab-saved -->

            <!-- Tab 2 Panel: Travel Notes -->
            <div class="dash-tab-panel-content" id="tab-notes" style="display: none;">
                <div class="dash-panel-card">
                    <h3 class="dash-panel-title">
                        <span class="material-symbols-outlined">assignment</span>
                        Catatan & Agenda Perjalanan
                    </h3>
                    <p class="dash-panel-subtitle">Buat daftar rencana belanja, perlengkapan esensial, atau agenda kuliner Anda untuk menaklukkan Malang Raya!</p>

                    <!-- Add Note Form -->
                    <form id="add-travel-note-form" class="note-form">
                        <input type="text" id="new-note-input" class="note-input" placeholder="Contoh: Siapkan jaket tebal untuk ke Kawah Bromo..." required />
                        <button type="submit" class="btn-add-note">Tambah Catatan</button>
                    </form>

                    <!-- Notes Container -->
                    <div id="travel-notes-list" class="notes-list">
                        <!-- Dynamically populated via JS -->
                    </div>
                </div>
            </div><!-- /#tab-notes -->

            <!-- Tab 3 Panel: Edit Profile -->
            <div class="dash-tab-panel-content" id="tab-profile" style="display: none;">
                <div class="dash-panel-card" style="max-width: 600px;">
                    <h3 class="dash-panel-title">Pengaturan Profil Petualang</h3>
                    <p class="dash-panel-subtitle">Kustomisasi identitas Anda di Malang Raya Tourism. Data profil disimpan di database MySQL.</p>

                    <form id="profile-edit-form" novalidate>
                        @csrf
                        
                        <!-- Avatar Presets -->
                        <div class="profile-form-group">
                            <label class="profile-form-label">Pilih Avatar Petualang</label>
                            <div class="avatar-grid">
                                <label class="avatar-option">
                                    <input type="radio" name="avatar" value="explorer" style="display:none;" />
                                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" class="avatar-preset-choice avatar-img-choice" data-preset="explorer" />
                                    <span class="avatar-label">Explorer</span>
                                </label>
                                <label class="avatar-option">
                                    <input type="radio" name="avatar" value="nature" style="display:none;" />
                                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka" class="avatar-preset-choice avatar-img-choice" data-preset="nature" />
                                    <span class="avatar-label">Nature</span>
                                </label>
                                <label class="avatar-option">
                                    <input type="radio" name="avatar" value="culinary" style="display:none;" />
                                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Buster" class="avatar-preset-choice avatar-img-choice" data-preset="culinary" />
                                    <span class="avatar-label">Culinary</span>
                                </label>
                                <label class="avatar-option">
                                    <input type="radio" name="avatar" value="heritage" style="display:none;" />
                                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie" class="avatar-preset-choice avatar-img-choice" data-preset="heritage" />
                                    <span class="avatar-label">Heritage</span>
                                </label>
                                <label class="avatar-option">
                                    <input type="radio" name="avatar" value="luxury" style="display:none;" />
                                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Missy" class="avatar-preset-choice avatar-img-choice" data-preset="luxury" />
                                    <span class="avatar-label">Luxury</span>
                                </label>
                            </div>
                        </div>

                        <!-- Full Name -->
                        <div class="profile-form-group">
                            <label class="profile-form-label" for="edit-profile-name">Nama Lengkap</label>
                            <div class="profile-input-wrap">
                                <span class="material-symbols-outlined profile-input-icon">person</span>
                                <input type="text" id="edit-profile-name" name="name" class="profile-input" required />
                            </div>
                        </div>

                        <!-- Email -->
                        <div class="profile-form-group">
                            <label class="profile-form-label" for="edit-profile-email">Alamat Email</label>
                            <div class="profile-input-wrap">
                                <span class="material-symbols-outlined profile-input-icon">mail</span>
                                <input type="email" id="edit-profile-email" name="email" class="profile-input" required />
                            </div>
                        </div>

                        <!-- Bio -->
                        <div class="profile-form-group">
                            <label class="profile-form-label" for="edit-profile-bio">Biografi Traveler</label>
                            <textarea id="edit-profile-bio" name="bio" rows="4" class="profile-textarea" placeholder="Ceritakan gaya petualangan Anda..."></textarea>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="btn-save-profile">
                            <span>Simpan Perubahan</span>
                            <span class="material-symbols-outlined">save</span>
                        </button>
                    </form>

                    <!-- Alert message container -->
                    <div id="profile-edit-msg" style="display:none; margin-top:18px; padding:12px; border-radius:12px; font-size:13px; font-weight:700; text-align:center;"></div>
                </div>
            </div><!-- /#tab-profile -->

        </div><!-- /#dashboard-logged-in-state -->
    </section>

    <!-- ===================== FOOTER ===================== -->
    <footer class="g-footer light">
        <div class="g-footer-inner">
            <div>
                <span class="g-footer-brand">Malang Raya Tourism Authority</span>
                <p class="g-footer-copy">© 2024 Malang Raya Tourism Authority. Intelligence by FCM Clustering.</p>
            </div>
            <div class="g-footer-links">
                <span style="color:var(--color-slate-400);font-size:0.875rem;">12.4k pengunjung bulan ini</span>
                <a class="g-footer-link" href="/directory">Directory</a>
                <a class="g-footer-link" href="#">Privacy Policy</a>
            </div>
        </div>
    </footer>

    <!-- ===================== PREMIUM DETAIL MODAL ===================== -->
    <div class="ota-modal-overlay" id="ota-detail-modal">
        <div class="ota-modal-content">
            <div class="ota-modal-gallery">
                <button class="ota-modal-close-btn" onclick="closeOtaDetail()" aria-label="Close">
                    <span class="material-symbols-outlined">close</span>
                </button>
                
                <button class="ota-modal-gallery-nav prev" id="modal-gallery-prev" aria-label="Previous image">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
                
                <div class="ota-modal-gallery-track" id="modal-gallery-track">
                    <!-- Injected dynamically -->
                </div>
                
                <button class="ota-modal-gallery-nav next" id="modal-gallery-next" aria-label="Next image">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
                
                <div class="ota-modal-gallery-indicators" id="modal-gallery-indicators">
                    <!-- Injected dynamically -->
                </div>
            </div>
            
            <div class="ota-modal-body">
                <div class="ota-modal-header-row">
                    <div>
                        <h3 class="ota-modal-title" id="modal-place-title">Nama Tempat</h3>
                        <div class="ota-modal-badges">
                            <span class="ota-modal-badge" id="modal-place-cat">Wisata</span>
                            <span class="ota-modal-badge hotel-badge" id="modal-place-subcat">Nature</span>
                        </div>
                    </div>
                    <div class="ota-modal-rating-badge">
                        <span class="material-symbols-outlined">star</span>
                        <span id="modal-place-rating">4.8</span>
                    </div>
                </div>
                
                <div class="ota-modal-info-grid">
                    <div class="ota-modal-info-item">
                        <span class="ota-modal-info-label" id="modal-price-label">Tiket Masuk</span>
                        <span class="ota-modal-info-val" id="modal-place-price">Rp 15.000</span>
                    </div>
                    <div class="ota-modal-info-item">
                        <span class="ota-modal-info-label">Jumlah Ulasan</span>
                        <span class="ota-modal-info-val" id="modal-place-reviews">1.250 ulasan</span>
                    </div>
                </div>
                
                <div class="ota-modal-desc-box">
                    <p id="modal-place-desc">
                        Nikmati pesona alam Malang Raya yang memikat dengan fasilitas premium. Tempat ini dikurasi secara cerdas menggunakan Fuzzy C-Means Clustering untuk menjamin kepuasan kunjungan Anda.
                    </p>
                </div>
                
                <div class="ota-modal-actions">
                    <a href="#" target="_blank" class="ota-modal-btn-primary" id="modal-gmaps-link">
                        <span class="material-symbols-outlined">map</span>
                        Buka Rute di Google Maps
                    </a>
                    <a href="#" class="ota-modal-btn-primary" id="modal-package-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); display: none; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                        <span class="material-symbols-outlined">auto_awesome</span>
                        Buat Paket Wisata
                    </a>
                    <button class="ota-modal-btn-secondary" id="modal-save-btn" onclick="savePlaceToggle()" aria-label="Save place">
                        <span class="material-symbols-outlined" id="modal-save-icon">bookmark</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
