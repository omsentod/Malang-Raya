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
                    <button type="submit" class="auth-submit-btn">
                        <span>Buat Akun</span>
                        <span class="material-symbols-outlined">person_add</span>
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<script src="{{ asset('assets/js/global-auth.js') }}"></script>
