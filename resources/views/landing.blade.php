<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Jelajahi destinasi wisata Malang Raya yang dikurasi menggunakan kecerdasan Fuzzy C-Means Clustering. Temukan wisata, hotel, dan kuliner terbaik sesuai budget Anda." />
    <title>Malang Raya — Jelajahi Secara Personal</title>

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
                <a class="g-nav-brand" href="/">Malang Raya</a>

                <!-- Center Links -->
                <div class="g-nav-center">
                    <a class="g-nav-link active" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/dashboard">Saved</a>
                </div>

                <!-- Right Actions -->
                <div class="g-nav-right">
                    <div class="g-nav-search">
                        <span class="material-symbols-outlined g-nav-search-icon">search</span>
                        <input type="text" placeholder="Cari destinasi..." id="nav-search-input" />
                    </div>
                    <a href="/recommender" class="g-nav-btn">Mulai Eksplorasi</a>
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
            <a class="g-mobile-link" href="/dashboard">Saved</a>
        </div>
    </div>

    <main>
        <!-- ===================== HERO ===================== -->
        <section class="hero-section" id="hero">
            <div class="hero-bg" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCatih-pNbXXCGm6QuoAcVY0MMf2wGse5wYV5oaYn_-dkzfEVIHzJczBrL-QGHAZSwUPfywYjE2Ufh6KPjxIjHwxiScWdL7oyY_uETC8xg6iv0mn7ao_f7xi4EXKERh4uKMgH_LOm8jCcNxafJRxBq5x4VbH1Mt5uUNQeuGf793xWk5i12huspYpknD8r0jSkMWAad6CA8MDZ5jWJJjQqXPRaXlsvhl3N9IONYqBhbGHMAsn-KTIkweOggAfyLKZJebE1lwErWbyI0');"></div>
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
                                <span>12.4k+ Pengunjung bulan ini</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>98% Tingkat Kepuasan Wisatawan</span>
                            </li>
                            <li class="stats-list-item">
                                <span class="material-symbols-outlined list-icon">check_circle</span>
                                <span>3 Segmen wisatawan terdefinisi oleh AI</span>
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

        <!-- ===================== BENTO GALLERY ===================== -->
        <section class="bento-gallery-section" id="explore">
            <div class="gallery-header reveal">
                <h2 class="section-title">Curated <span class="section-title-accent">Highlights</span></h2>
                <a href="/directory" class="gallery-view-all">
                    Lihat Semua
                    <span class="material-symbols-outlined">arrow_forward</span>
                </a>
            </div>

            <div class="bento-grid reveal">
                <!-- Bromo large -->
                <div class="bento-item item-large">
                    <img class="bento-img" alt="Gunung Bromo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe7CCISLd5OVWY6D9-IbfnzCXF1LNiRBNLycO_VP_o6941Hlg0rI5g7elYR6vBs8VI8JQsKH1130K9wsi8YBV1jQMhL5r_5qO2tZZ8n6e1RDeTgVkL5q-7HQyUb2ivEgetliS9-g1sUwfxnCbfkV5w-e5xhAGl3wLXdl97ifdWLR0m5t32dZcmOgsZDtm3MPT7fG0gQcAIBcV58MWqB_SzjaS2RhElHJwhexJwcOFsJJAVLVOK_KUaeVxQXecV-SoaVi9dtcGQfDw" />
                    <div class="bento-overlay"></div>
                    <div class="bento-content">
                        <span class="bento-badge">MUST VISIT</span>
                        <h4 class="bento-title bento-title-lg">Gunung Bromo</h4>
                        <p class="bento-desc">The iconic sea of sand.</p>
                    </div>
                </div>

                <!-- Batu Wide -->
                <div class="bento-item item-wide">
                    <img class="bento-img" alt="Wisata Kota Batu" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBW4539av5uBFkoFDoszku6F4jQ1Uknx_yXV6SM31Qcmln97Wp0kCjCs3b-ZMw30tUeGl8Z8CtY6CS0D6Hc9YQAtFeV-sPEMCna27PXJenqIeZ07B1ISDacB7srrII1uXc0ycGUrMjHyCTUEu2PUjeqsp6wjDarK7yWb3aWDra0SQiqCwHNu-_tTqmbjYLjfWhVUoWW24AbpR2MqoHXL2-JsbbdRgxhyOdLIuKfjXNKWTyyuy6kmvqCl4yx2E1_W62arYcB_7lSwQ" />
                    <div class="bento-overlay"></div>
                    <div class="bento-content">
                        <h4 class="bento-title bento-title-md">Wisata Kota Batu</h4>
                        <p class="bento-desc">Family &amp; Theme Parks</p>
                    </div>
                </div>

                <!-- Cafe Standard -->
                <div class="bento-item item-standard">
                    <img class="bento-img" alt="Malang Coffee Culture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRJKZ5SbTqXKF8ptBCy0kd08LGWHsxlkPq2dppPKZ9C_8gk7YImKARXL7qQA5LtQlRDKHAPndLJUs5SWvYRtVPNyzAidqeZsIFeqWcqenjCodJtsYHdOserdZSfPUGNxxLusAUA9b_hGYx2iO66gPt3pB0ZufyuFKIvLLBhA2LQw2oLcsbfn0J_b1Jo0rDEKbQHXs0rcraueIdUbBMVf5VgxWxdsxY2SG9B9HJJ7vTmLHV2t5uSKCUdSAT3bpxs3YQ9pC3BNSAhMo" />
                    <div class="bento-overlay"></div>
                    <div class="bento-content bento-content-center">
                        <h4 class="bento-title bento-title-sm">Malang Coffee Culture</h4>
                    </div>
                </div>

                <!-- Nature Standard -->
                <div class="bento-item item-standard">
                    <img class="bento-img" alt="Hidden Tea Garden" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKNnEl7VBJlrneHcg6gZLGGhMHBXLbhmJIyDaeFWPbO-9DTt6g7BtDFkIOQPnENz5D-wHRhQAgP9Bghuzs9p_NooXEgtwtIel9nPjaFCV58ro4an8hzYyCHOXQ4WsBIjZ-Tr4X-V_h1AkZHP49XXr6QmBNoQD5OdpwP7g47HcDuGxUP8PnuWr4iBGcFujRhoZ-UlIaW5QnNdgLl5ueTSG1tA0r4ciI-HdCcjLIlBQv8H1WOkSLZIglbPEbrdFmNbnklFi7-ARUJ64" />
                    <div class="bento-overlay"></div>
                    <div class="bento-content bento-content-center">
                        <h4 class="bento-title bento-title-sm">Hidden Tea Garden</h4>
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

</body>
</html>
