<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Dashboard wisata Malang Raya — lihat destinasi tersimpan, rekomendasi AI, dan alokasi budget perjalanan Anda." />
    <title>Saved — Malang Raya Tourism</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-3.css') }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-3.js') }}" defer></script>
</head>
<body>

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/">Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link active" href="/dashboard">Saved</a>
                </div>
                <div class="g-nav-right">
                    <div class="g-nav-search">
                        <span class="material-symbols-outlined g-nav-search-icon">search</span>
                        <input type="text" placeholder="Cari destinasi..." />
                    </div>
                    <div class="dash-avatar">P</div>
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
            <a class="g-mobile-link active" href="/dashboard">Saved</a>
        </div>
    </div>

    <!-- ===================== PLACE DETAILS ===================== -->
    <section class="place-section">
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
                            <button class="btn-book">Book Now</button>
                            <button class="btn-save">
                                <span class="material-symbols-outlined">bookmark</span>
                                Save to My Plan
                            </button>
                        </div>

                        <div class="ai-suggestion">
                            <div class="ai-icon-wrap">
                                <span class="material-symbols-outlined">auto_awesome</span>
                            </div>
                            <p class="ai-text">
                                AI kami menyarankan kunjungan saat <strong>Golden Hour (16:30)</strong> untuk pengalaman teh terbaik di teras bersejarah.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===================== DASHBOARD ===================== -->
    <section class="dash-section">
        <div class="dash-container">

            <!-- Dashboard Header -->
            <header class="dash-header reveal">
                <div class="dash-profile">
                    <div class="dash-avatar-wrap">
                        <img class="dash-profile-img" alt="Profile Sarah" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMLAbhnQmBCMwYqzO4zfEEHmB1fOCJb6SEaLqUPAm-_O8DtDYl4EZvcredtkUCeepyXi-8MAx3TNkWJvqR14OutVTeolmYYGkG8vxTa548diMQZjFKvBSk4A5lh2F7kno06ES5QLJA4k5lIUABJFK425cEkikH1SxGZqUrHaBp61oDxhSV1Pk_Qwm-caYEk5Q6gb0VoPa6BPz1NdTcBSc8BP6ShkdKler0iahIGf1lmDlhBBQI8Dw015FIuENDfE6ZmzcsLT5EM9A" />
                        <div class="dash-status-dot"></div>
                    </div>
                    <div>
                        <p class="dash-greeting">Welcome back,</p>
                        <h2 class="dash-name">Sarah Amara</h2>
                        <p class="dash-role">
                            <span class="material-symbols-outlined" style="font-size:1rem;font-variation-settings:'FILL' 1;color:var(--color-tertiary-container);">stars</span>
                            Elite Explorer · 12 Destinasi
                        </p>
                    </div>
                </div>
                <div class="dash-stats-row">
                    <div class="dash-stat-pill">
                        <span class="dash-stat-label">Trip Points</span>
                        <span class="dash-stat-val">4,820</span>
                    </div>
                    <div class="dash-stat-pill">
                        <span class="dash-stat-label">Active Plans</span>
                        <span class="dash-stat-val">2</span>
                    </div>
                </div>
            </header>

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
                        <div class="saved-grid">
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
                                <span class="rec-label">AI Recommendation Engine</span>
                            </div>
                            <h3 class="rec-title">
                                Karena Anda menyukai <span class="rec-highlight text-glow">The Shalimar</span>, kami sarankan:
                            </h3>
                            <div class="rec-scroll">
                                <div class="rec-card">
                                    <img class="rec-img" alt="Melati Restaurant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_Z8lUue-yuSG1XpAg4dmHLQMt9lBoMZPHe1PWxXKeYXBH-Rw5-4TR4P8MFOZEARzGzwxbwLYonOwqyG-zFzEypC62EST19YR5xwq-sNl-kyIiak7WMFFBh1nIc0uwgYaenFa7SvwJADkpn26f7XNNVXRSV1-tLDZQL1YyEKACFDBzyfp1F0ewpA-93GQUHJOkImzO0vOLvJE2FI25ZzfasPtDaIKvj_ZjK90w7x8_Jzhn-kybS_nfybtz-SEVLVDEXvG_FD8_7sk" />
                                    <div class="rec-card-info">
                                        <h4 class="rec-card-name">Melati Restaurant</h4>
                                        <p class="rec-card-desc">High-end Heritage Dining</p>
                                    </div>
                                </div>
                                <div class="rec-card">
                                    <img class="rec-img" alt="Tugu Hotel" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD3Vcs_J3gs00lTunInTlsqm7bkN5IBjE2AvhjDeZXjwqB32AJBaIAUzKuYv0kBqRwm7Ec0GLXrsurBDqLMnj2m2SLiC6l3iBQLMuOFl-R3GO9DBwGeek1TfNuQAgCsuqiDwnBZLYhDPSKy_T3-X3KIGTFIgvoC409slWmF_HRuHtLlCgIsKjigCqPv9Q0BLRFWm3oHhtQRqTwczaSTXVWjXHbozBaoBvkUNyHdIYJHogFgvYSwPTscAUyonCWKoQj5zuaFOXxFhY" />
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
                    <!-- Budget -->
                    <div class="sidebar-widget reveal">
                        <h3 class="sidebar-widget-title">Budget Allocation</h3>
                        <div class="budget-list">
                            <div class="budget-item" data-pct="40">
                                <div class="budget-label-row">
                                    <span>Akomodasi (40%)</span>
                                    <span class="budget-amount">IDR 12.0M</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-primary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="25">
                                <div class="budget-label-row">
                                    <span>Kuliner (25%)</span>
                                    <span class="budget-amount">IDR 7.5M</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-secondary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="20">
                                <div class="budget-label-row">
                                    <span>Eksplorasi (20%)</span>
                                    <span class="budget-amount">IDR 6.0M</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-tertiary" style="width:0"></div>
                                </div>
                            </div>
                            <div class="budget-item" data-pct="15">
                                <div class="budget-label-row">
                                    <span>Transport (15%)</span>
                                    <span class="budget-amount">IDR 4.5M</span>
                                </div>
                                <div class="budget-track">
                                    <div class="budget-fill budget-muted" style="width:0"></div>
                                </div>
                            </div>
                        </div>
                        <div class="budget-total">
                            <span>Total Budget</span>
                            <span class="budget-total-val">IDR 30.0M</span>
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
            </div>
        </div>
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

</body>
</html>
