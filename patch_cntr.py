import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# Define the formatter helper
helper = """    def format_cntr(cntr):
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
"""

# Replace the existing code
old_code = """    global LAST_CLUSTERED
    hotel_cntr_str = str(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = str(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = str(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
"""

if old_code in content:
    content = content.replace(old_code, helper)
else:
    print("Could not find the target code to replace!")

with open('storage/app/python/recommender.py', 'w') as f:
    f.write(content)

