<link rel="stylesheet" href="{{ asset('assets/css/preloader.css') }}" />

<div id="global-preloader" class="global-preloader">
    <div class="preloader-content">
        <div class="logo-fill-container">
            <!-- Background grey silhouette -->
            <img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" class="logo-silhouette" alt="Silhouette" />
            <!-- Foreground colored fill mask -->
            <div class="logo-fill-mask" id="preloader-mask">
                <img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" class="logo-colored" alt="Colored Logo" />
            </div>
        </div>
        <div class="preloader-text-wrap">
            <div class="preloader-pct" id="preloader-pct">0%</div>
            <div class="preloader-status">Memuat Eksplorasi Malang Raya...</div>
        </div>
    </div>
</div>

<script src="{{ asset('assets/js/preloader.js') }}"></script>

