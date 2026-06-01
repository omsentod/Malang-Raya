<!-- BOOKMARK DRAWER (CART) -->
<div class="bookmark-drawer-overlay" id="bookmark-drawer-overlay"></div>
<div class="bookmark-drawer" id="bookmark-drawer">
    <div class="drawer-header">
        <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-symbols-outlined" style="color:var(--color-primary); font-size:24px;">bookmarks</span>
            <h3 style="margin:0; font-size:18px; font-weight:800; color:var(--color-on-surface);">Rencana Perjalanan Saya</h3>
        </div>
        <button class="drawer-close-btn" id="drawer-close-btn">
            <span class="material-symbols-outlined">close</span>
        </button>
    </div>
    <div class="drawer-body" id="bookmark-drawer-body">
        <!-- Dynamically populated via JS from localStorage -->
        <div class="empty-drawer-state">
            <span class="material-symbols-outlined" style="font-size:48px; color:var(--color-slate-300); margin-bottom:12px;">shopping_bag</span>
            <p style="margin:0; color:var(--color-slate-400); font-size:14px; font-weight:500;">Belum ada rencana perjalanan yang disimpan.</p>
            <p style="margin:4px 0 0; color:var(--color-slate-400); font-size:12px;">Gunakan alur kerja Explore untuk merancang rute perjalanan kustom Anda.</p>
        </div>
    </div>
</div>

<!-- ROUTE DETAIL MODAL -->
<div class="modal-overlay" id="route-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Detail & Rute Perjalanan</h3>
            <button class="modal-close" id="modal-close-btn-global"><span class="material-symbols-outlined" style="font-size:24px">close</span></button>
        </div>
        <div class="modal-body" id="modal-body-content">
            <!-- Injected via JS -->
        </div>
    </div>
</div>
