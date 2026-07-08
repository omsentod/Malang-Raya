import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# 1. Update LAST_CLUSTERED
content = re.sub(
    r'(LAST_CLUSTERED = \{\n\s+"hotel": [^\n]+,\n\s+"wisata": [^\n]+,\n\s+"kuliner": [^\n]+,)(\n\s+\})',
    r'\1\n        "hotel_cntr": clustered.get("hotel", {}).get("cntr") if "hotel" in clustered else None,\n        "wisata_cntr": clustered.get("wisata", {}).get("cntr") if "wisata" in clustered else None,\n        "kuliner_cntr": clustered.get("kuliner", {}).get("cntr") if "kuliner" in clustered else None,\2',
    content
)
content = re.sub(
    r'(LAST_CLUSTERED = \{\n\s+"hotel": [^\n]+,\n\s+"wisata": df_wisata,\n\s+"kuliner": [^\n]+,)(\n\s+\})',
    r'\1\n        "hotel_cntr": clustered.get("hotel", {}).get("cntr") if "hotel" in clustered else None,\n        "wisata_cntr": None,\n        "kuliner_cntr": clustered.get("kuliner", {}).get("cntr") if "kuliner" in clustered else None,\2',
    content
)

# 2. Update pkg_formatted
# First occurrence
content = content.replace(
    '"hotel_nama": h_item["Nama_Tempat"] if duration > 1 else "Tanpa Akomodasi (One Day Trip)",\n',
    '"hotel_nama": h_item["Nama_Tempat"] if duration > 1 else "Tanpa Akomodasi (One Day Trip)",\n                "hotel_md": h_item.get("Membership_Degree", 1.0) if duration > 1 else 1.0,\n'
)
content = content.replace(
    '"wisata_nama": w_item["Nama_Tempat"],\n',
    '"wisata_nama": w_item["Nama_Tempat"],\n                "wisata_md": w_item.get("Membership_Degree", 1.0),\n'
)
content = content.replace(
    '"kuliner_pagi_nama": k_pagi_item["Nama_Tempat"] if k_pagi_item else "N/A",\n',
    '"kuliner_pagi_nama": k_pagi_item["Nama_Tempat"] if k_pagi_item else "N/A",\n                "kuliner_pagi_md": k_pagi_item.get("Membership_Degree", 1.0) if k_pagi_item else 1.0,\n'
)
content = content.replace(
    '"kuliner_nama": k_item["Nama_Tempat"],\n',
    '"kuliner_nama": k_item["Nama_Tempat"],\n                "kuliner_md": k_item.get("Membership_Degree", 1.0),\n'
)
content = content.replace(
    '"kuliner_malam_nama": k_malam_item["Nama_Tempat"] if k_malam_item else "N/A",\n',
    '"kuliner_malam_nama": k_malam_item["Nama_Tempat"] if k_malam_item else "N/A",\n                "kuliner_malam_md": k_malam_item.get("Membership_Degree", 1.0) if k_malam_item else 1.0,\n'
)

# Second and Third occurrence
content = content.replace(
    '"hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",\n',
    '"hotel_nama": h_item.get("Nama_Tempat", "N/A") if duration > 1 else "Tanpa Akomodasi (1 Hari)",\n                "hotel_md": h_item.get("Membership_Degree", 1.0) if duration > 1 else 1.0,\n'
)
content = content.replace(
    '"wisata_nama": w_item.get("Nama_Tempat", "N/A"),\n',
    '"wisata_nama": w_item.get("Nama_Tempat", "N/A"),\n                "wisata_md": w_item.get("Membership_Degree", 1.0),\n'
)
content = content.replace(
    '"kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",\n',
    '"kuliner_pagi_nama": k_pagi_item.get("Nama_Tempat", "N/A") if k_pagi_item else "N/A",\n                "kuliner_pagi_md": k_pagi_item.get("Membership_Degree", 1.0) if k_pagi_item else 1.0,\n'
)
content = content.replace(
    '"kuliner_nama": k_item.get("Nama_Tempat", "N/A"),\n',
    '"kuliner_nama": k_item.get("Nama_Tempat", "N/A"),\n                "kuliner_md": k_item.get("Membership_Degree", 1.0),\n'
)
content = content.replace(
    '"kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",\n',
    '"kuliner_malam_nama": k_malam_item.get("Nama_Tempat", "N/A") if k_malam_item else "N/A",\n                "kuliner_malam_md": k_malam_item.get("Membership_Degree", 1.0) if k_malam_item else 1.0,\n'
)


with open('storage/app/python/recommender.py', 'w') as f:
    f.write(content)

