import os
import re

def process_file(blade_path, css_path, js_path, css_asset_path, js_asset_path):
    with open(blade_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract CSS
    css_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if css_match:
        css_content = css_match.group(1).strip()
        os.makedirs(os.path.dirname(css_path), exist_ok=True)
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
        
        # Replace <style> block with <link>
        link_tag = f'<link rel="stylesheet" href="{{{{ asset(\'{css_asset_path}\') }}}}" />'
        content = re.sub(r'<style>.*?</style>', link_tag, content, flags=re.DOTALL)
        print(f'Extracted CSS to {css_path}')

    # Extract JS
    js_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
    if js_match:
        js_content = js_match.group(1).strip()
        os.makedirs(os.path.dirname(js_path), exist_ok=True)
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        # Replace <script> block with external script tag
        script_tag = f'<script src="{{{{ asset(\'{js_asset_path}\') }}}}"></script>'
        content = re.sub(r'<script>.*?</script>', script_tag, content, flags=re.DOTALL)
        print(f'Extracted JS to {js_path}')

    # Write modified blade file
    with open(blade_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {blade_path}')

base_dir = '/Users/macbookpro/Documents/GITHUB/rekomendasi-wisata-app'

# Process recom.blade.php
process_file(
    os.path.join(base_dir, 'resources/views/recom.blade.php'),
    os.path.join(base_dir, 'public/assets/css/recom.css'),
    os.path.join(base_dir, 'public/assets/js/recom.js'),
    'assets/css/recom.css',
    'assets/js/recom.js'
)

# Process how-it-works.blade.php
process_file(
    os.path.join(base_dir, 'resources/views/how-it-works.blade.php'),
    os.path.join(base_dir, 'public/assets/css/how-it-works.css'),
    os.path.join(base_dir, 'public/assets/js/how-it-works.js'),
    'assets/css/how-it-works.css',
    'assets/js/how-it-works.js'
)

print('Done!')
