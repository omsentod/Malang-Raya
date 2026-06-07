import re
import sys

def main():
    try:
        with open('public/assets/js/recom.js', 'r') as f:
            content = f.read()
            
        # We need to replace the messy duplicate HTML in kuliner_pagi, kuliner, kuliner_malam
        
        # 1. Clean up the custom-select-trigger-inactive with duplicate styles
        content = re.sub(
            r'<div class="custom-select-trigger-inactive"[^>]*?style="[^"]*"[^>]*?style="[^"]*"[^>]*?title="Pilih paket terlebih dahulu untuk merancang">\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*<span[^>]*>.*?</span>\s*</div>',
            r'''<div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner_pagi || ''}</span>
                                        <span class="material-symbols-outlined custom-select-trigger-icon">lock</span>
                                    </div>''',
            content,
            flags=re.DOTALL
        )
        
        # 2. General cleanup for Kuliner Pagi/Siang/Malam duplicates. 
        # Actually it's easier to find the whole block and replace it.
    except Exception as e:
        print(e)

if __name__ == '__main__':
    main()
