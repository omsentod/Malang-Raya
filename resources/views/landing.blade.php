<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Jelajahi destinasi wisata Malang Raya yang dikurasi menggunakan kecerdasan Fuzzy C-Means Clustering. Temukan wisata, hotel, dan kuliner terbaik sesuai budget Anda." />
    <title>Malang Raya — Jelajahi Secara Personal</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-2.js') }}" defer></script>
</head>
<body>
    @include('preloader')

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <!-- Brand -->
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>

                <!-- Center Links -->
                <div class="g-nav-center">
                    <a class="g-nav-link active" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/directory">Directory</a>
                </div>

                <!-- Right Actions -->
                <div class="g-nav-right">
                    <div class="g-nav-search" style="position: relative;">
                        <span class="material-symbols-outlined g-nav-search-icon">search</span>
                        <input type="text" placeholder="Cari destinasi..." id="nav-search-input" autocomplete="off" />
                        <div id="search-autocomplete-dropdown" class="search-autocomplete-dropdown"></div>
                    </div>
                    <button class="g-nav-bookmark-btn" id="nav-bookmark-btn" title="Rencana Perjalanan Saya">
                        <span class="material-symbols-outlined">bookmarks</span>
                        <span class="bookmark-label">Rencana Saya</span>
                        <span class="bookmark-badge" id="bookmark-badge-count">0</span>
                    </button>
                    <div id="nav-profile-container" style="display: flex; align-items: center;"></div>
                    <button class="g-nav-hamburger" id="hamburger-btn" aria-label="Menu">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </nav>
        <!-- Mobile Menu -->
        <div class="g-mobile-menu" id="mobile-menu">
            <a class="g-mobile-link active" href="/">Home</a>
            <a class="g-mobile-link" href="/recommender">Explore</a>
            <a class="g-mobile-link" href="/how-it-works">How It Works</a>
            <a class="g-mobile-link" href="/directory">Directory</a>
        </div>
    </div>

    <main>
        <!-- ===================== HERO ===================== -->
        @php
            $heroImages = [];
            if (isset($catalog['wisata']) && is_array($catalog['wisata'])) {
                foreach ($catalog['wisata'] as $item) {
                    if ($item['Has_Gambar'] && !empty($item['Gambar'])) {
                        $heroImages[] = $item['Gambar'][0];
                    }
                }
            }
            shuffle($heroImages);
            $heroImages = array_slice($heroImages, 0, 5);
            $firstHeroImage = !empty($heroImages) ? $heroImages[0] : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCatih-pNbXXCGm6QuoAcVY0MMf2wGse5wYV5oaYn_-dkzfEVIHzJczBrL-QGHAZSwUPfywYjE2Ufh6KPjxIjHwxiScWdL7oyY_uETC8xg6iv0mn7ao_f7xi4EXKERh4uKMgH_LOm8jCcNxafJRxBq5x4VbH1Mt5uUNQeuGf793xWk5i12huspYpknD8r0jSkMWAad6CA8MDZ5jWJJjQqXPRaXlsvhl3N9IONYqBhbGHMAsn-KTIkweOggAfyLKZJebE1lwErWbyI0';
        @endphp
        <section class="hero-section" id="hero">
            <div class="hero-bg-container" data-images="{{ json_encode($heroImages) }}">
                <div class="hero-bg bg-slide-1" style="background-image: url('{{ $firstHeroImage }}'); opacity: 1; filter: brightness(0.58) saturate(0.85) contrast(1.02);"></div>
                <div class="hero-bg bg-slide-2" style="background-image: url(''); opacity: 0; filter: brightness(0.58) saturate(0.85) contrast(1.02);"></div>
            </div>
            <div class="hero-overlay"></div>

            <!-- Floating badge -->
            <div class="hero-float-badge reveal">
                <span class="material-symbols-outlined">auto_awesome</span>
                <span>FCM Clustering Intelligence</span>
            </div>

            <div class="hero-content reveal reveal-delay-1">
                <h1 class="hero-title">
                    Jelajahi Malang Raya<br />
                    <span class="hero-highlight text-glow">Secara Personal</span>
                </h1>
                <p class="hero-desc">
                    Rekomendasi destinasi cerdas menggunakan algoritma Fuzzy C-Means Clustering. Temukan wisata, hotel, dan kuliner terbaik yang sesuai dengan budget & karakter perjalanan Anda.
                </p>
                <div class="hero-actions">
                    <a class="btn-teal" href="/recommender">
                        Mulai Konsultasi FCM
                        <span class="material-symbols-outlined">arrow_forward</span>
                    </a>
                    <a class="hero-btn-ghost" href="#explore">
                        Lihat Destinasi
                        <span class="material-symbols-outlined">expand_more</span>
                    </a>
                </div>
            </div>

            <!-- Hero floating stats -->
            <div class="hero-stats reveal reveal-delay-2">
                <div class="hero-stat-item">
                    <span class="hero-stat-num">3</span>
                    <span class="hero-stat-label">Workflow Rekomendasi</span>
                </div>
                <div class="hero-stat-divider"></div>
                <div class="hero-stat-item">
                    <span class="hero-stat-num">FCM</span>
                    <span class="hero-stat-label">Fuzzy C-Means Clustering</span>
                </div>
                <div class="hero-stat-divider"></div>
                <div class="hero-stat-item">
                    <span class="hero-stat-num">OSRM</span>
                    <span class="hero-stat-label">Rute & Jarak Akurat</span>
                </div>
            </div>
        </section>

        <!-- ===================== DYNAMIC OTA CATALOG & CAROUSEL ===================== -->
        <section class="ota-catalog-section" id="explore">
            <div class="gallery-header reveal" style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2.5rem;">
                <div>
                    <h2 class="section-title" style="margin: 0;">Katalog Destinasi <span class="section-title-accent">Unggulan</span></h2>
                    <p class="section-subtitle" style="margin: 0.5rem 0 0 0; text-align: left;">Jelajahi keindahan Malang Raya. Pilih kategori untuk menyaring petualangan Anda.</p>
                </div>
                <a href="/directory" class="btn-teal" style="padding: 0.65rem 1.75rem; font-size: 0.875rem; box-shadow: 0 4px 14px rgba(0, 101, 101, 0.2); display: inline-flex; align-items: center; gap: 0.5rem; border-radius: var(--radius-full);">
                    Lihat Semua
                    <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
                </a>
            </div>

            <!-- Category Toggle Filter -->
            <div class="ota-toggle-container reveal">
                <button class="ota-toggle-btn active" data-filter="Semua">
                    <span class="material-symbols-outlined">explore</span>
                    Semua
                </button>
                <button class="ota-toggle-btn" data-filter="Wisata">
                    <span class="material-symbols-outlined">landscape</span>
                    Wisata 🌲
                </button>
                <button class="ota-toggle-btn" data-filter="Hotel">
                    <span class="material-symbols-outlined">hotel</span>
                    Hotel 🏨
                </button>
                <button class="ota-toggle-btn" data-filter="Kuliner">
                    <span class="material-symbols-outlined">restaurant</span>
                    Kuliner 🍜
                </button>
            </div>

            <!-- Sliding Carousel -->
            <div class="ota-carousel-wrapper reveal" style="position: relative;">
                <button class="ota-carousel-arrow prev" id="ota-prev-btn" aria-label="Previous">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
                
                <div class="ota-carousel-inner">
                    <div class="ota-carousel-track" id="ota-carousel-track">
                        @foreach(['wisata', 'hotel', 'kuliner'] as $catKey)
                            @if(isset($catalog[$catKey]) && is_array($catalog[$catKey]))
                                @foreach($catalog[$catKey] as $item)
                                    <div class="ota-carousel-card" data-category="{{ $item['Kategori'] }}" onclick="openOtaDetail({{ json_encode($item) }})">
                                        <div class="ota-card-img-wrapper">
                                            @if($item['Has_Gambar'] && count($item['Gambar']) > 0)
                                                <img class="ota-card-img" src="{{ $item['Gambar'][0] }}" alt="{{ $item['Nama_Tempat'] }}" onerror="handleImgError(this)" />
                                            @else
                                                <div class="ota-shimmer-placeholder">
                                                    <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                                                    <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                                                </div>
                                            @endif
                                            <span class="ota-card-badge">{{ $item['Kategori'] }}</span>
                                            <span class="ota-card-rating">
                                                <span class="material-symbols-outlined star-icon">star</span>
                                                {{ number_format($item['Rating'], 1) }}
                                            </span>
                                        </div>
                                        <div class="ota-card-body">
                                            <div class="ota-card-subcat">{{ $item['Sub_Kategori'] }}</div>
                                            <h4 class="ota-card-title">{{ $item['Nama_Tempat'] }}</h4>
                                            <div class="ota-card-footer">
                                                <div>
                                                    <div class="ota-card-price-label">
                                                        @if($item['Kategori'] == 'Wisata')
                                                            Tiket Masuk
                                                        @elseif($item['Kategori'] == 'Hotel')
                                                            Per Malam
                                                        @else
                                                            Menu Porsi
                                                        @endif
                                                    </div>
                                                    <div class="ota-card-price-value">
                                                        @if($item['Estimasi_Harga'] > 0)
                                                            Rp {{ number_format($item['Estimasi_Harga'], 0, ',', '.') }}
                                                        @else
                                                            Gratis
                                                        @endif
                                                    </div>
                                                </div>
                                                <button class="ota-card-btn">
                                                    Detail
                                                    <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                @endforeach
                            @endif
                        @endforeach
                    </div>
                </div>

                <button class="ota-carousel-arrow next" id="ota-next-btn" aria-label="Next">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </section>

        <!-- ===================== TRAVEL STYLE ===================== -->
        <section class="travel-style-section" id="workflows">
            <div class="section-header center reveal">
                <span class="section-eyebrow">Pilih Gaya Perjalanan Anda</span>
                <h2 class="section-title">Kami Kurasi, <span class="section-title-accent">Anda Menikmati</span></h2>
                <p class="section-subtitle">Algoritma FCM kami mempelajari pola pengeluaran wisatawan untuk memberikan rekomendasi yang presisi.</p>
            </div>

            <div class="style-cards-grid">
                <!-- Card 1: Budget -->
                <div class="style-card card-surface reveal reveal-delay-1">
                    <div class="card-icon-wrapper icon-teal">
                        <span class="material-symbols-outlined">account_balance_wallet</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">Punya Budget Pas?</h3>
                        <p class="card-desc">Optimalisasi pengeluaran dengan algoritma FCM. Kami temukan titik temu antara kenyamanan dan harga terbaik untuk setiap rupiah Anda.</p>
                    </div>
                    <div class="card-footer-badge">
                        <span class="material-symbols-outlined">memory</span>
                        <span>FCM Intelligence Powered</span>
                    </div>
                </div>

                <!-- Card 2: Planned (featured) -->
                <div class="style-card card-featured reveal reveal-delay-2">
                    <div class="card-shine"></div>
                    <div class="card-icon-wrapper icon-white">
                        <span class="material-symbols-outlined">location_on</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title" style="color:#fff;">Sudah Tahu Mau ke Mana?</h3>
                        <p class="card-desc" style="color:rgba(255,255,255,0.75);">Berikan daftar destinasi impian Anda, dan biarkan sistem FCM merancang rute perjalanan terefisien di Malang Raya.</p>
                    </div>
                    <a href="/recommender" class="btn-card-white">
                        Input Destinasi
                        <span class="material-symbols-outlined">arrow_forward</span>
                    </a>
                </div>

                <!-- Card 3: Discovery -->
                <div class="style-card card-surface reveal reveal-delay-3">
                    <div class="card-icon-wrapper icon-teal">
                        <span class="material-symbols-outlined">explore</span>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">Cuma Mau Lihat-Lihat?</h3>
                        <p class="card-desc">Jelajahi galeri editorial kami yang dikurasi oleh pakar lokal. Temukan permata tersembunyi Malang yang jarang diketahui wisatawan lain.</p>
                    </div>
                    <div class="card-footer-badge">
                        <span class="material-symbols-outlined">auto_stories</span>
                        <span>Editorial Curated</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===================== STATS ===================== -->
        <section class="stats-section">
            <div class="stats-blur-1"></div>
            <div class="stats-blur-2"></div>
            <div class="stats-container">
                <div class="stats-split">
                    <div class="stats-text-area reveal">
                        <span class="stats-eyebrow">Official Data Insight</span>
                        <h2 class="stats-title">Mengapa Malang?</h2>
                        <p class="stats-desc">Berdasarkan data statistik BPS terbaru, Malang Raya terus menjadi magnet utama pariwisata di Jawa Timur. Pertumbuhan kunjungan mencerminkan keragaman daya tarik dari alam hingga kuliner modern.</p>
                        <ul class="stats-list">
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>Destinasi Unggulan Pariwisata di Jawa Timur</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>Pertumbuhan Kunjungan Wisatawan Domestik & Mancanegara</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>Keragaman Daya Tarik Wisata Alam, Buatan, serta Kuliner</span>
                            </li>
                        </ul>
                    </div>

                    <div class="stats-chart-area reveal reveal-delay-2">
                        <h4 class="chart-title">Volume Pengunjung (BPS 2023)</h4>
                        <div class="chart-bars">
                            <div class="bar-item" data-value="75">
                                <div class="bar-label-row">
                                    <span>Kota Malang</span>
                                    <span class="bar-value">4.2M</span>
                                </div>
                                <div class="bar-track">
                                    <div class="bar-fill fill-dim" style="width: 0"></div>
                                </div>
                            </div>
                            <div class="bar-item" data-value="95">
                                <div class="bar-label-row">
                                    <span>Kota Batu</span>
                                    <span class="bar-value">8.5M</span>
                                </div>
                                <div class="bar-track">
                                    <div class="bar-fill fill-glow" style="width: 0"></div>
                                </div>
                            </div>
                            <div class="bar-item" data-value="60">
                                <div class="bar-label-row">
                                    <span>Kab. Malang</span>
                                    <span class="bar-value">3.1M</span>
                                </div>
                                <div class="bar-track">
                                    <div class="bar-fill fill-dim" style="width: 0"></div>
                                </div>
                            </div>
                        </div>
                        <p class="chart-footer-note">*Data agregat per tahun. Intelligence system membantu mendistribusikan trafik secara merata.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===================== CTA STRIP ===================== -->
        <section class="cta-strip">
            <div class="cta-inner reveal">
                <div class="cta-text">
                    <h2 class="cta-title">Siap Merencanakan Perjalanan?</h2>
                    <p class="cta-desc">Masukkan budget Anda dan biarkan sistem FCM bekerja dalam hitungan detik.</p>
                </div>
                <a href="/recommender" class="btn-teal">
                    Mulai Sekarang
                    <span class="material-symbols-outlined">auto_awesome</span>
                </a>
            </div>
        </section>
    </main>

    <!-- ===================== FOOTER ===================== -->
    <footer class="g-footer light">
        <div class="g-footer-inner">
            <div>
                <span class="g-footer-brand">Malang Raya</span>
                <p class="g-footer-copy">© 2024 Malang Raya Tourism Authority. Intelligence by FCM Clustering.</p>
            </div>
            <div class="g-footer-links">
                <span style="color:var(--color-slate-400); font-size:0.875rem;">Sistem Pendukung Keputusan</span>
                <a class="g-footer-link" href="/directory">Directory</a>
                <a class="g-footer-link" href="/how-it-works">How It Works</a>
                <a class="g-footer-link" href="#">Privacy Policy</a>
            </div>
        </div>
    </footer>

    <!-- ===================== OTA PREMIUM DETAIL MODAL ===================== -->
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

    <!-- ===================== JAVASCRIPT OTA ENGINE ===================== -->
    <script src="{{ asset('assets/js/landing-custom.js') }}"></script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
