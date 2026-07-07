<!-- ===================== GLASSMORPHIC AUTHENTICATION MODAL ===================== -->
<div class="auth-modal-overlay" id="auth-modal-overlay">
    <div class="auth-modal-container">
        <!-- Close Button -->
        <button class="auth-modal-close-btn" id="auth-modal-close-btn" aria-label="Close Authentication">
            <span class="material-symbols-outlined">close</span>
        </button>

        <div class="auth-modal-glass">
            <!-- Modal Header / Tabs -->
            <div class="auth-tabs">
                <button class="auth-tab-btn active" data-tab="login-tab-content">Masuk</button>
                <button class="auth-tab-btn" data-tab="register-tab-content">Daftar</button>
            </div>

            <!-- Error Alerts Container -->
            <div class="auth-error-container" id="auth-error-box" style="display: none;">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #ef4444; flex-shrink: 0;">error</span>
                <div class="auth-error-list" id="auth-error-list"></div>
            </div>

            <!-- LOGIN FORM CONTENT -->
            <div class="auth-tab-content active" id="login-tab-content">
                <h3 class="auth-form-title">Selamat Datang Kembali!</h3>
                <p class="auth-form-subtitle">Masuk untuk mengakses rencana perjalanan Anda & mengelola profil petualang.</p>
                <form id="ajax-login-form" novalidate>
                    @csrf
                    <div class="auth-input-group">
                        <label for="login-email">Alamat Email</label>
                        <div class="auth-input-wrap">
                            <span class="material-symbols-outlined auth-input-icon">mail</span>
                            <input type="email" id="login-email" name="email" placeholder="nama@email.com" required />
                        </div>
                    </div>
                    <div class="auth-input-group">
                        <label for="login-password">Password</label>
                        <div class="auth-input-wrap">
                            <span class="material-symbols-outlined auth-input-icon">lock</span>
                            <input type="password" id="login-password" name="password" placeholder="••••••••" required />
                        </div>
                    </div>
                    <button type="submit" class="auth-submit-btn">
                        <span>Masuk Sekarang</span>
                        <span class="material-symbols-outlined">arrow_forward</span>
                    </button>
                </form>
            </div>

            <!-- REGISTER FORM CONTENT -->
            <div class="auth-tab-content" id="register-tab-content" style="display: none;">
                <h3 class="auth-form-title">Mulai Petualangan Baru!</h3>
                <p class="auth-form-subtitle">Buat akun untuk menyimpan objek wisata kustom Malang Raya secara permanen.</p>
                <form id="ajax-register-form" novalidate>
                    @csrf
                    <div class="auth-input-group">
                        <label for="register-name">Nama Lengkap</label>
                        <div class="auth-input-wrap">
                            <span class="material-symbols-outlined auth-input-icon">person</span>
                            <input type="text" id="register-name" name="name" placeholder="Manuel Neuer" required />
                        </div>
                    </div>
                    <div class="auth-input-group">
                        <label for="register-email">Alamat Email</label>
                        <div class="auth-input-wrap">
                            <span class="material-symbols-outlined auth-input-icon">mail</span>
                            <input type="email" id="register-email" name="email" placeholder="nama@email.com" required />
                        </div>
                    </div>
                    <div class="auth-input-group">
                        <label for="register-password">Password</label>
                        <div class="auth-input-wrap">
                            <span class="material-symbols-outlined auth-input-icon">lock</span>
                            <input type="password" id="register-password" name="password" placeholder="Minimal 6 karakter" required />
                        </div>
                    </div>
                    
                    <div class="auth-input-group" style="margin-top: 15px;">
                        <label>Preferensi Kategori Wisata (Opsional)</label>
                        <div class="auth-input-wrap" style="padding: 0;">
                            <select name="pref_wisata" class="auth-select" style="width: 100%; border: none; background: transparent; padding: 12px; color: var(--text-color); font-size: 14px; outline: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;">
                                <option value="" selected>Tidak ada preferensi (Bebas)</option>
                                <option value="Wisata Alam">Wisata Alam</option>
                                <option value="Wisata Budaya & Edukasi">Wisata Budaya & Edukasi</option>
                                <option value="Wisata Rekreasi Modern">Wisata Rekreasi Modern</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="auth-input-group">
                        <label>Preferensi Akomodasi (Opsional)</label>
                        <div class="auth-input-wrap" style="padding: 0;">
                            <select name="pref_hotel" class="auth-select" style="width: 100%; border: none; background: transparent; padding: 12px; color: var(--text-color); font-size: 14px; outline: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;">
                                <option value="" selected>Tidak ada preferensi (Bebas)</option>
                                <option value="Resort / Villa">Resort / Villa</option>
                                <option value="Penginapan / Homestay">Penginapan / Homestay</option>
                                <option value="Hotel Bintang 5">Hotel Bintang 5</option>
                                <option value="Hotel Bintang 4">Hotel Bintang 4</option>
                                <option value="Hotel Bintang 3">Hotel Bintang 3</option>
                                <option value="Hotel Bintang 2">Hotel Bintang 2</option>
                                <option value="Hotel Bintang 1">Hotel Bintang 1</option>
                                <option value="Hotel">Hotel (Umum)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="auth-input-group">
                        <label>Preferensi Kuliner (Opsional)</label>
                        <div class="auth-input-wrap" style="padding: 0;">
                            <select name="pref_kuliner" class="auth-select" style="width: 100%; border: none; background: transparent; padding: 12px; color: var(--text-color); font-size: 14px; outline: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;">
                                <option value="" selected>Tidak ada preferensi (Bebas)</option>
                                <option value="Warung / Kuliner Lokal">Warung / Kuliner Lokal</option>
                                <option value="Restoran">Restoran</option>
                                <option value="Cafe & Coffee Shop">Cafe & Coffee Shop</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="auth-submit-btn" style="margin-top: 20px;">
                        <span>Buat Akun</span>
                        <span class="material-symbols-outlined">person_add</span>
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<script src="{{ asset('assets/js/global-auth.js') }}"></script>
