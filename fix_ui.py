import re
import os

def fix_js():
    filepath = 'public/assets/js/recom.js'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the regex to catch the duplicated style/tags in Kuliner Pagi/Siang/Malam
    # 1. custom-select-trigger-inactive (solid border)
    patt1 = r'<div class="custom-select-trigger-inactive"\s+style="display: flex;[^"]*border: 1\.5px solid[^"]*?"\s+style="display: flex;[^"]*?"\s+title="Pilih paket terlebih dahulu untuk merancang">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*</div>'
    content = re.sub(patt1, r'''<div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">\1</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>''', content)

    # 2. custom-select-trigger-inactive (dashed border)
    patt2 = r'<div class="custom-select-trigger-inactive"\s+style="display: flex;[^"]*border: 1\.5px dashed[^"]*?"\s+style="display: flex;[^"]*?"\s+title="Pilih wisata terlebih dahulu untuk membuka kuliner">\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*</div>'
    content = re.sub(patt2, r'''<div class="custom-select-trigger-inactive dashed" title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span class="custom-select-trigger-text font-semibold text-slate-450">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>''', content)

    # 3. custom-select-trigger (active) that has duplicated style and tags
    patt3 = r'<div class="custom-select-trigger"\s+data-class-idx="([^"]*)"\s+data-day="([^"]*)"\s+data-type="([^"]*)"\s+style="display: flex;[^"]*?"(?:>|>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*style="display: flex;[^"]*?">)\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>.*?</span>\s*</div>'
    content = re.sub(patt3, r'''<div class="custom-select-trigger" 
                                         data-class-idx="\1" 
                                         data-day="\2"
                                         data-type="\3">
                                        <span class="custom-select-trigger-text">\4</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>''', content)

    # 4. Now clean up all remaining inline styles for these classes to rely on recom.css
    content = re.sub(
        r'<div class="custom-select-trigger-inactive"\s+style="display: flex;[^"]*"\s+title="([^"]*)">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>(.*?)</span>\s*</div>',
        r'''<div class="custom-select-trigger-inactive" title="\1">
                                        <span class="custom-select-trigger-text">\2</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">\3</span>
                                    </div>''',
        content
    )
    content = re.sub(
        r'<div class="custom-select-trigger-locked"\s+style="display: flex;[^"]*"\s+title="([^"]*)">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>(.*?)</span>\s*</div>',
        r'''<div class="custom-select-trigger-locked" title="\1">
                                        <span class="custom-select-trigger-text">\2</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">\3</span>
                                    </div>''',
        content
    )
    content = re.sub(
        r'<div class="custom-select-trigger"\s+data-class-idx="([^"]*)"\s+data-type="([^"]*)"\s+style="display: flex;[^"]*">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>(.*?)</span>\s*</div>',
        r'''<div class="custom-select-trigger" data-class-idx="\1" data-type="\2">
                                        <span class="custom-select-trigger-text">\3</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">\4</span>
                                    </div>''',
        content
    )
    content = re.sub(
        r'<div class="custom-select-trigger"\s+data-class-idx="([^"]*)"\s+data-night="([^"]*)"\s+data-type="([^"]*)"\s+style="display: flex;[^"]*">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>(.*?)</span>\s*</div>',
        r'''<div class="custom-select-trigger" data-class-idx="\1" data-night="\2" data-type="\3">
                                        <span class="custom-select-trigger-text">\4</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">\5</span>
                                    </div>''',
        content
    )
    
    # 5. Remove inline styles from custom-search-select-dropdown
    content = re.sub(
        r'<div class="custom-search-select-dropdown" style="\s*position: absolute;[^"]*"></div>',
        r'<div class="custom-search-select-dropdown"></div>',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def append_css():
    filepath = 'public/assets/css/recom.css'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    css_to_add = """
/* ─── CUSTOM DROPDOWN SELECTS ─── */
.custom-select-trigger-inactive,
.custom-select-trigger-locked,
.custom-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    user-select: none;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
}
.custom-select-trigger-inactive {
    border: 1.5px solid var(--slate-200);
    background: var(--slate-50);
    color: var(--slate-400);
    cursor: not-allowed;
}
.custom-select-trigger-inactive.dashed {
    border: 1.5px dashed var(--slate-300);
}
.custom-select-trigger-locked {
    border: 1.5px solid var(--slate-200);
    background: var(--slate-100);
    color: var(--slate-500);
    cursor: not-allowed;
}
.custom-select-trigger {
    border: 1.5px solid var(--slate-200);
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
}
.custom-select-trigger:hover {
    border-color: var(--teal-400);
}
.custom-select-trigger-text {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
}
.custom-select-trigger-icon {
    flex-shrink: 0;
    font-size: 16px;
}
.font-semibold {
    font-weight: 600;
}
.text-slate-450 {
    color: #818f9c; /* approx mid slate */
}
.custom-search-select-dropdown {
    position: absolute;
    top: 100%; 
    left: 0; 
    right: 0;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 101, 101, 0.15);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
    z-index: 1000;
    max-height: 250px;
    overflow-y: auto;
    display: none;
    margin-top: 4px;
}
"""
    if "/* ─── CUSTOM DROPDOWN SELECTS ─── */" not in content:
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(css_to_add)

if __name__ == '__main__':
    fix_js()
    append_css()
    print("Fixed JS and CSS")
