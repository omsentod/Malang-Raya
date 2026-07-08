import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# Define the new helper and meta rows
old_helper = """    def format_cntr(cntr):
        if cntr is None or len(cntr) == 0: return "N/A"
        try:
            import numpy as np
            # Flatten to 1D array in case it's 2D
            flat_cntr = np.ravel(cntr)
            return "[" + ", ".join([f"Rp {int(c):,.0f}" for c in flat_cntr]) + "]"
        except Exception:
            return str(cntr)
            
    global LAST_CLUSTERED
    hotel_cntr_str = format_cntr(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = format_cntr(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = format_cntr(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
    
    meta_rows = [
        {"Informasi": "Input Workflow", "Nilai": workflow.upper()},
        {"Informasi": "Input Budget", "Nilai": f"Rp {budget:,.0f}" if budget else "Tanpa Budget"},
        {"Informasi": "Input Peserta", "Nilai": f"{persons} Orang"},
        {"Informasi": "Input Durasi", "Nilai": f"{duration} Hari"},
        {"Informasi": "Centroid Hotel (Hemat/Balanced/Premium)", "Nilai": hotel_cntr_str},
        {"Informasi": "Centroid Wisata", "Nilai": wisata_cntr_str},
        {"Informasi": "Centroid Kuliner", "Nilai": kuliner_cntr_str},
    ]"""

new_helper = """    def format_cntr(cntr):
        if cntr is None or len(cntr) == 0: return "N/A"
        try:
            import numpy as np
            flat_cntr = np.ravel(cntr)
            
            c = len(flat_cntr)
            if c == 2:
                labels = ["Hemat", "Premium"]
            elif c == 3:
                labels = ["Hemat", "Balanced", "Premium"]
            elif c == 4:
                labels = ["Hemat", "Balanced", "Premium", "Luxury"]
            else:
                labels = [f"Kelas {i+1}" for i in range(c)]
                
            parts = []
            for i, val in enumerate(flat_cntr):
                label = labels[i] if i < len(labels) else f"Kelas {i+1}"
                parts.append(f"{label}: Rp {int(val):,.0f}")
                
            return " | ".join(parts)
        except Exception:
            return str(cntr)
            
    global LAST_CLUSTERED
    hotel_cntr_str = format_cntr(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = format_cntr(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = format_cntr(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
    
    meta_rows = [
        {"Informasi": "Input Workflow", "Nilai": workflow.upper()},
        {"Informasi": "Input Budget", "Nilai": f"Rp {budget:,.0f}" if budget else "Tanpa Budget"},
        {"Informasi": "Input Peserta", "Nilai": f"{persons} Orang"},
        {"Informasi": "Input Durasi", "Nilai": f"{duration} Hari"},
        {"Informasi": "Centroid Hotel", "Nilai": hotel_cntr_str},
        {"Informasi": "Centroid Wisata", "Nilai": wisata_cntr_str},
        {"Informasi": "Centroid Kuliner", "Nilai": kuliner_cntr_str},
    ]"""

if old_helper in content:
    content = content.replace(old_helper, new_helper)
else:
    print("Could not find old_helper block!")

with open('storage/app/python/recommender.py', 'w') as f:
    f.write(content)

