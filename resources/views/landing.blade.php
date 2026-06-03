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
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-2.js') }}" defer></script>
</head>
<body>

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
                        Mulai Konsultasi AI
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
                    <span class="hero-stat-num">12.4k+</span>
                    <span class="hero-stat-label">Pengunjung / Bulan</span>
                </div>
                <div class="hero-stat-divider"></div>
                <div class="hero-stat-item">
                    <span class="hero-stat-num">98%</span>
                    <span class="hero-stat-label">Tingkat Kepuasan</span>
                </div>
                <div class="hero-stat-divider"></div>
                <div class="hero-stat-item">
                    <span class="hero-stat-num">3</span>
                    <span class="hero-stat-label">Kluster Wisata AI</span>
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
                        <p class="card-desc" style="color:rgba(255,255,255,0.75);">Berikan daftar destinasi impian Anda, dan biarkan AI kami merancang rute perjalanan terefisien di Malang Raya.</p>
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
                                <span>12.4k+ Rekomendasi AI Berhasil Dibuat</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>98% Tingkat Kepuasan Wisatawan Malang Raya</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>3 Kluster Utama (FCM) Teroptimasi Sistem</span>
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
                    <p class="cta-desc">Masukkan budget Anda dan biarkan AI kami bekerja dalam hitungan detik.</p>
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
                <span style="color:var(--color-slate-400); font-size:0.875rem;">12.4k pengunjung bulan ini</span>
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
    <script>
        // 1. GLOBAL IMAGE ERROR HANDLER
        window.handleImgError = function(el) {
            if (el.dataset.fallbackTriggered) return;
            el.dataset.fallbackTriggered = "true";
            const parent = el.parentNode;
            if (parent) {
                parent.innerHTML = `
                    <div class="ota-shimmer-placeholder">
                        <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                        <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                    </div>
                `;
            }
        };

        // 2. LEVENSHTEIN FUZZY MATCH ALGORITHM FOR AUTOCORRECT
        function levenshteinDistance(s, t) {
            if (!s.length) return t.length;
            if (!t.length) return s.length;
            const arr = [];
            for (let i = 0; i <= t.length; i++) { arr[i] = [i]; }
            for (let j = 0; j <= s.length; j++) { arr[0][j] = j; }
            for (let i = 1; i <= t.length; i++) {
                for (let j = 1; j <= s.length; j++) {
                    arr[i][j] = s[j - 1] === t[i - 1] 
                        ? arr[i - 1][j - 1] 
                        : Math.min(arr[i - 1][j - 1] + 1, arr[i][j - 1] + 1, arr[i - 1][j] + 1);
                }
            }
            return arr[t.length][s.length];
        }

        function findTypoAutocorrect(query, items) {
            if (query.length < 3) return null;
            const cleanQuery = query.toLowerCase().trim();
            let bestMatch = null;
            let minDistance = 3; // Maximum typo tolerance distance

            for (const item of items) {
                const name = item.Nama_Tempat.toLowerCase();
                // Split words for fuzzy matching on single words
                const words = name.split(/\s+/);
                for (const word of words) {
                    if (word.length < 3) continue;
                    const distance = levenshteinDistance(cleanQuery, word);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestMatch = item;
                    }
                }
            }
            return bestMatch;
        }

        // 3. SEARCH AUTOCOMPLETE ENGINE
        let searchIndex = [];
        const searchInput = document.getElementById('nav-search-input');
        const searchDropdown = document.getElementById('search-autocomplete-dropdown');

        // Asynchronously fetch search index
        fetch('/assets/search_index.json')
            .then(res => res.json())
            .then(data => {
                searchIndex = data;
            })
            .catch(err => console.error("Error loading search index:", err));

        if (searchInput && searchDropdown) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                renderSearchSuggestions(query);
            });

            // Close search on clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                    searchDropdown.classList.remove('open');
                }
            });

            // Show suggestions on focus if not empty
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim().length > 0) {
                    searchDropdown.classList.add('open');
                }
            });
        }

        function renderSearchSuggestions(query) {
            if (!searchDropdown) return;
            const cleanQuery = query.trim().toLowerCase();
            
            if (cleanQuery.length === 0) {
                searchDropdown.classList.remove('open');
                return;
            }

            searchDropdown.classList.add('open');
            searchDropdown.innerHTML = '';

            // Filter index
            const matches = [];
            const exactRegex = new RegExp(escapeRegExp(cleanQuery), 'i');

            for (const item of searchIndex) {
                if (exactRegex.test(item.Nama_Tempat) || exactRegex.test(item.Kategori)) {
                    matches.push(item);
                }
                if (matches.length >= 8) break; // Limit to 8 suggestions
            }

            let html = '';

            // Check for Autocorrect Typo matches if no exact match found or low matches
            if (matches.length < 3) {
                const autocorrectSuggestion = findTypoAutocorrect(cleanQuery, searchIndex);
                if (autocorrectSuggestion && !matches.some(m => m.Id_Tempat === autocorrectSuggestion.Id_Tempat)) {
                    html += `
                        <div class="autocomplete-autocorrect-banner">
                            <span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span>
                            <span>Maksud Anda: <strong onclick="triggerAutocorrectClick(${JSON.stringify(autocorrectSuggestion).replace(/"/g, '&quot;')})">${autocorrectSuggestion.Nama_Tempat}</strong>?</span>
                        </div>
                    `;
                }
            }

            if (matches.length === 0 && html === '') {
                searchDropdown.innerHTML = `
                    <div class="autocomplete-empty">
                        <span class="material-symbols-outlined">search_off</span>
                        <h5>Tidak Ada Hasil</h5>
                        <p>Cobalah kata kunci lain seperti "bromo", "hotel", atau "sate".</p>
                    </div>
                `;
                return;
            }

            html += `<div class="autocomplete-section-title">Hasil Pencarian</div>`;

            matches.forEach(item => {
                const priceFormatted = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';
                const hasImg = item.Gambar && item.Gambar.length > 0;
                
                const imgHTML = hasImg
                    ? `<img class="suggestion-thumb" src="${item.Gambar[0]}" alt="${item.Nama_Tempat}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="suggestion-shimmer" style="display:none;"></div>`
                    : `<div class="ota-shimmer-placeholder suggestion-thumb">
                           <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-slate-400);">landscape</span>
                       </div>`;

                // Highlight matching characters
                const highlightedName = item.Nama_Tempat.replace(
                    new RegExp(`(${escapeRegExp(query)})`, 'gi'),
                    '<span class="suggestion-highlight">$1</span>'
                );

                html += `
                    <div class="autocomplete-suggestion" onclick='triggerAutocorrectClick(${JSON.stringify(item).replace(/"/g, '&quot;')})'>
                        ${imgHTML}
                        <div class="suggestion-info">
                            <div class="suggestion-title">${highlightedName}</div>
                            <div class="suggestion-meta">
                                <span class="suggestion-badge">${item.Kategori}</span>
                                <span>• ${item.Sub_Kategori}</span>
                            </div>
                        </div>
                        <div class="suggestion-price">${priceFormatted}</div>
                    </div>
                `;
            });

            searchDropdown.innerHTML = html;
        }

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function triggerAutocorrectClick(item) {
            if (searchInput) searchInput.value = '';
            if (searchDropdown) searchDropdown.classList.remove('open');
            openOtaDetail(item);
        }

        function fmtRupiah(num) {
            return 'Rp ' + Math.round(num).toLocaleString('id-ID');
        }

        // 4. AUTO-SLIDING CAROUSEL CONTROLLER
        const track = document.getElementById('ota-carousel-track');
        const prevBtn = document.getElementById('ota-prev-btn');
        const nextBtn = document.getElementById('ota-next-btn');
        const filterBtns = document.querySelectorAll('.ota-toggle-btn');
        const cards = document.querySelectorAll('.ota-carousel-card');

        let activeFilter = 'Semua';
        let visibleCards = [];
        let carouselIndex = 0;
        let autoSlideInterval = null;

        function updateCarouselFilter(filter) {
            activeFilter = filter;
            carouselIndex = 0;
            
            // Show/hide cards matching filter
            cards.forEach(card => {
                if (filter === 'Semua' || card.dataset.category === filter) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });

            // Update cached visible cards list
            visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
            
            // Reset track transform
            if (track) track.style.transform = 'translateX(0)';

            // Update next/prev buttons state
            updateArrowButtons();
        }

        function getCardWidth() {
            if (visibleCards.length === 0) return 0;
            const card = visibleCards[0];
            const style = window.getComputedStyle(card);
            const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
            // Default Gap inside track is 1.5rem (24px)
            return card.offsetWidth + 24; 
        }

        function slideCarousel(direction) {
            if (visibleCards.length <= 1) return;
            const cardWidth = getCardWidth();
            const containerWidth = track.parentNode.offsetWidth;
            const maxIndex = visibleCards.length - Math.floor(containerWidth / cardWidth);

            if (direction === 'next') {
                if (carouselIndex >= maxIndex) {
                    carouselIndex = 0; // Wrap around to beginning
                } else {
                    carouselIndex++;
                }
            } else {
                if (carouselIndex <= 0) {
                    carouselIndex = maxIndex > 0 ? maxIndex : 0; // Wrap around to end
                } else {
                    carouselIndex--;
                }
            }

            if (track) {
                track.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
            }
        }

        function updateArrowButtons() {
            if (visibleCards.length <= 1) {
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
            } else {
                if (prevBtn) prevBtn.style.display = 'flex';
                if (nextBtn) nextBtn.style.display = 'flex';
            }
        }

        // Auto sliding runner
        function startAutoSlide() {
            stopAutoSlide();
            autoSlideInterval = setInterval(() => {
                slideCarousel('next');
            }, 4000);
        }

        function stopAutoSlide() {
            if (autoSlideInterval) {
                clearInterval(autoSlideInterval);
                autoSlideInterval = null;
            }
        }

        // Attach Carousel Event listeners
        if (prevBtn) prevBtn.addEventListener('click', () => { slideCarousel('prev'); startAutoSlide(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { slideCarousel('next'); startAutoSlide(); });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateCarouselFilter(btn.dataset.filter);
                startAutoSlide();
            });
        });

        // Pause sliding on Hover (hover-stop)
        const wrapper = document.querySelector('.ota-carousel-wrapper');
        if (wrapper) {
            wrapper.addEventListener('mouseenter', stopAutoSlide);
            wrapper.addEventListener('mouseleave', startAutoSlide);
        }

        // Initial setup
        updateCarouselFilter('Semua');
        startAutoSlide();

        // Responsive resize recalculation
        window.addEventListener('resize', () => {
            updateCarouselFilter(activeFilter);
        });


        // 5. PRODUCT DETAIL MODAL POP-UP SYSTEM
        const detailModal = document.getElementById('ota-detail-modal');
        const modalTrack = document.getElementById('modal-gallery-track');
        const modalIndicators = document.getElementById('modal-gallery-indicators');
        const modalPrev = document.getElementById('modal-gallery-prev');
        const modalNext = document.getElementById('modal-gallery-next');

        let activePlace = null;
        let modalImgIndex = 0;
        let modalSlideInterval = null;

        window.openOtaDetail = function(item) {
            activePlace = item;
            modalImgIndex = 0;

            // Record search query/item name dynamically
            if (item && item.Nama_Tempat) {
                const key = window.currentUser ? 'mraya_recent_searches_' + window.currentUser.id : 'mraya_recent_searches_guest';
                let searches = JSON.parse(localStorage.getItem(key) || '[]');
                searches = searches.filter(s => s.toLowerCase() !== item.Nama_Tempat.toLowerCase());
                searches.unshift(item.Nama_Tempat);
                searches = searches.slice(0, 5);
                localStorage.setItem(key, JSON.stringify(searches));
            }

            // Fill text values
            document.getElementById('modal-place-title').textContent = item.Nama_Tempat;
            document.getElementById('modal-place-cat').textContent = item.Kategori;
            document.getElementById('modal-place-subcat').textContent = item.Sub_Kategori;
            document.getElementById('modal-place-rating').textContent = Number(item.Rating).toFixed(1);
            document.getElementById('modal-place-reviews').textContent = item.Jumlah_Ulasan.toLocaleString('id-ID') + ' ulasan';
            
            const priceLabel = document.getElementById('modal-price-label');
            if (item.Kategori === 'Wisata') {
                priceLabel.textContent = 'Tiket Masuk';
            } else if (item.Kategori === 'Hotel') {
                priceLabel.textContent = 'Per Malam';
            } else {
                priceLabel.textContent = 'Menu Porsi';
            }

            document.getElementById('modal-place-price').textContent = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';

            // Custom descriptions based on categories & subcategories
            let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
            if (item.Kategori === 'Hotel') {
                desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
            } else if (item.Kategori === 'Kuliner') {
                desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
            }
            document.getElementById('modal-place-desc').textContent = desc;

            // Maps route link
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
            document.getElementById('modal-gmaps-link').href = mapsUrl;

            // Package button visibility and href
            const packageBtn = document.getElementById('modal-package-btn');
            if (packageBtn) {
                if (item.Kategori === 'Wisata') {
                    packageBtn.style.display = 'inline-flex';
                    packageBtn.href = `/recommender?workflow=destination&dest_id=${item.Id_Tempat}&dest_name=${encodeURIComponent(item.Nama_Tempat)}`;
                } else {
                    packageBtn.style.display = 'none';
                    packageBtn.href = '#';
                }
            }

            // Check bookmark status
            const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
            const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
            const isSaved = saved.some(id => id === item.Id_Tempat);
            const saveIcon = document.getElementById('modal-save-icon');
            if (saveIcon) {
                saveIcon.textContent = isSaved ? 'bookmark_added' : 'bookmark';
                saveIcon.style.color = isSaved ? 'var(--color-primary)' : 'inherit';
            }

            // Render Images slideshow
            renderModalSlideshow();

            // Open modal overlay
            detailModal.classList.add('show');
            stopAutoSlide(); // Pause main landing carousel
        };

        window.closeOtaDetail = function() {
            detailModal.classList.remove('show');
            clearInterval(modalSlideInterval);
            startAutoSlide(); // Resume main landing carousel
        };

        function renderModalSlideshow() {
            modalTrack.innerHTML = '';
            modalIndicators.innerHTML = '';
            
            const imgs = activePlace.Gambar || [];
            
            if (imgs.length === 0) {
                // Show animated placeholder
                modalTrack.innerHTML = `
                    <div class="ota-modal-gallery-slide">
                        <div class="ota-shimmer-placeholder">
                            <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                            <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                        </div>
                    </div>
                `;
                modalPrev.style.display = 'none';
                modalNext.style.display = 'none';
                return;
            }

            modalPrev.style.display = imgs.length > 1 ? 'flex' : 'none';
            modalNext.style.display = imgs.length > 1 ? 'flex' : 'none';

            // Add Slides
            imgs.forEach((img, i) => {
                modalTrack.innerHTML += `
                    <div class="ota-modal-gallery-slide">
                        <img src="${img}" alt="${activePlace.Nama_Tempat}" onerror="handleImgError(this)" />
                    </div>
                `;
                modalIndicators.innerHTML += `
                    <div class="ota-modal-gallery-indicator ${i === 0 ? 'active' : ''}" onclick="slideModalTo(${i})"></div>
                `;
            });

            // Set slide bounds
            slideModalTo(0);
            
            // Auto slide inside modal
            clearInterval(modalSlideInterval);
            if (imgs.length > 1) {
                modalSlideInterval = setInterval(() => {
                    slideModalNext();
                }, 3500);
            }
        }

        function slideModalTo(index) {
            const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
            if (count <= 1) return;

            modalImgIndex = index;
            modalTrack.style.transform = `translateX(-${index * 100}%)`;

            // Update Indicators
            const indicators = modalIndicators.querySelectorAll('.ota-modal-gallery-indicator');
            indicators.forEach((ind, i) => {
                if (i === index) ind.classList.add('active');
                else ind.classList.remove('active');
            });
        }

        function slideModalNext() {
            const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
            if (count <= 1) return;
            const nextIdx = (modalImgIndex + 1) % count;
            slideModalTo(nextIdx);
        }

        function slideModalPrev() {
            const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
            if (count <= 1) return;
            const prevIdx = (modalImgIndex - 1 + count) % count;
            slideModalTo(prevIdx);
        }

        // Attach modal gallery listeners
        if (modalPrev) modalPrev.addEventListener('click', () => { slideModalPrev(); clearInterval(modalSlideInterval); });
        if (modalNext) modalNext.addEventListener('click', () => { slideModalNext(); clearInterval(modalSlideInterval); });

        // Bookmark saved toggle
        window.savePlaceToggle = function() {
            if (!activePlace) return;
            const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
            const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
            const index = saved.indexOf(activePlace.Id_Tempat);
            const saveIcon = document.getElementById('modal-save-icon');

            if (index > -1) {
                saved.splice(index, 1);
                saveIcon.textContent = 'bookmark';
                saveIcon.style.color = 'inherit';
            } else {
                saved.push(activePlace.Id_Tempat);
                saveIcon.textContent = 'bookmark_added';
                saveIcon.style.color = 'var(--color-primary)';
            }
            localStorage.setItem(savedPlacesKey, JSON.stringify(saved));
            if (window.updateNavbarBookmarkBadge) window.updateNavbarBookmarkBadge();
        };

        // 6. HERO RANDOM AUTO-SLIDING BACKGROUND SLIDESHOW (CINEMATIC DOUBLE-BUFFER CROSS-FADE)
        function initHeroSlideshow() {
            const container = document.querySelector('.hero-bg-container');
            const slide1 = document.querySelector('.bg-slide-1');
            const slide2 = document.querySelector('.bg-slide-2');
            if (!container || !slide1 || !slide2) return;

            let heroImages = [];
            try {
                heroImages = JSON.parse(container.getAttribute('data-images') || '[]');
            } catch (e) {
                console.error("Error parsing hero images from server:", e);
            }

            function runSlideshow(images) {
                if (!images || images.length <= 1) return;
                
                let currentIndex = 0;
                let isSlide1Active = true;

                // Adjust initial style filters to ensure optimum readability for text overlays
                slide1.style.filter = "brightness(0.58) saturate(0.85) contrast(1.02)";
                slide2.style.filter = "brightness(0.58) saturate(0.85) contrast(1.02)";

                setInterval(() => {
                    currentIndex = (currentIndex + 1) % images.length;
                    const nextImg = images[currentIndex];

                    if (isSlide1Active) {
                        // Load image to slide2 (hidden), fade it in, fade slide1 out
                        slide2.style.backgroundImage = `url('${nextImg}')`;
                        slide2.style.opacity = '1';
                        slide1.style.opacity = '0';
                    } else {
                        // Load image to slide1 (hidden), fade it in, fade slide2 out
                        slide1.style.backgroundImage = `url('${nextImg}')`;
                        slide1.style.opacity = '1';
                        slide2.style.opacity = '0';
                    }
                    isSlide1Active = !isSlide1Active;
                }, 6000); // Cinematic cross-fade every 6 seconds
            }

            if (heroImages.length > 1) {
                runSlideshow(heroImages);
            } else {
                // Client-side fallback if server-side data is empty
                let checkInterval = setInterval(() => {
                    if (searchIndex && searchIndex.length > 0) {
                        clearInterval(checkInterval);
                        
                        const wisataWithImgs = searchIndex.filter(item => item.Kategori === 'Wisata' && item.Gambar && item.Gambar.length > 0);
                        if (wisataWithImgs.length === 0) return;

                        const selectedSpots = [];
                        const tempIndex = [...wisataWithImgs];
                        for (let i = 0; i < Math.min(5, wisataWithImgs.length); i++) {
                            const randIdx = Math.floor(Math.random() * tempIndex.length);
                            selectedSpots.push(tempIndex.splice(randIdx, 1)[0]);
                        }
                        const imgs = selectedSpots.map(s => s.Gambar[0]);
                        
                        slide1.style.backgroundImage = `url('${imgs[0]}')`;
                        runSlideshow(imgs);
                    }
                }, 100);
            }
        }
        initHeroSlideshow();

        // Close on clicking backdrop overlay
        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal) closeOtaDetail();
            });
        }
    </script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
