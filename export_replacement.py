import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# Define new function body
new_func = """def export_to_excel_recom(options_list, workflow, budget, persons, duration):
    \"\"\"
    Mengekspor hasil kombinasi rute rekomendasi ke dalam berkas Excel (.xlsx).
    Sheet 1: Menampilkan item secara detail (Opsi, Item, Harga, Membership Degree) beserta info centroid.
    Sheet 2: Menampilkan breakdown itinerary dan total cost.
    \"\"\"
    import datetime
    import os
    import pandas as pd
    from config import OUTPUT_DIR
    
    # 1. Definisikan folder output
    out_folder = os.path.join(OUTPUT_DIR, "hasil-rekomendasi")
    os.makedirs(out_folder, exist_ok=True)
    
    # 2. Bangun nama file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    budget_str = f"{int(budget)}" if budget else "tanpa_budget"
    filename = f"rekomendasi_{workflow}_{timestamp}_b{budget_str}_p{persons}_d{duration}.xlsx"
    filepath = os.path.join(out_folder, filename)
    
    # 3. Data Metadata / Input User & Centroid
    global LAST_CLUSTERED
    hotel_cntr_str = str(LAST_CLUSTERED.get("hotel_cntr", [])) if LAST_CLUSTERED else "N/A"
    wisata_cntr_str = str(LAST_CLUSTERED.get("wisata_cntr", [])) if LAST_CLUSTERED else "N/A"
    kuliner_cntr_str = str(LAST_CLUSTERED.get("kuliner_cntr", [])) if LAST_CLUSTERED else "N/A"
    
    meta_rows = [
        {"Informasi": "Input Workflow", "Nilai": workflow.upper()},
        {"Informasi": "Input Budget", "Nilai": f"Rp {budget:,.0f}" if budget else "Tanpa Budget"},
        {"Informasi": "Input Peserta", "Nilai": f"{persons} Orang"},
        {"Informasi": "Input Durasi", "Nilai": f"{duration} Hari"},
        {"Informasi": "Centroid Hotel (Hemat/Balanced/Premium)", "Nilai": hotel_cntr_str},
        {"Informasi": "Centroid Wisata", "Nilai": wisata_cntr_str},
        {"Informasi": "Centroid Kuliner", "Nilai": kuliner_cntr_str},
    ]
    df_meta = pd.DataFrame(meta_rows)
    
    # 4. Sheet 1: Detail Item Per Package
    item_rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            kelas = pkg.get("kategori", "N/A").upper()
            base_row = {
                "Opsi": f"Opsi {opt_idx}",
                "Kelas Paket": kelas
            }
            
            # Hotel
            row_h = base_row.copy()
            row_h.update({
                "Tipe Item": "Hotel",
                "Nama Tempat": pkg.get("hotel_nama", "N/A"),
                "Estimasi Harga": pkg.get("hotel_harga", 0),
                "Membership Degree": pkg.get("hotel_md", 1.0)
            })
            item_rows.append(row_h)
            
            # Wisata
            row_w = base_row.copy()
            row_w.update({
                "Tipe Item": "Wisata",
                "Nama Tempat": pkg.get("wisata_nama", "N/A"),
                "Estimasi Harga": pkg.get("wisata_harga", 0),
                "Membership Degree": pkg.get("wisata_md", 1.0)
            })
            item_rows.append(row_w)
            
            # Kuliner Pagi
            row_kp = base_row.copy()
            row_kp.update({
                "Tipe Item": "Makan Pagi",
                "Nama Tempat": pkg.get("kuliner_pagi_nama", "N/A"),
                "Estimasi Harga": pkg.get("kuliner_pagi_harga", 0),
                "Membership Degree": pkg.get("kuliner_pagi_md", 1.0)
            })
            item_rows.append(row_kp)
            
            # Kuliner Siang
            row_ks = base_row.copy()
            row_ks.update({
                "Tipe Item": "Makan Siang",
                "Nama Tempat": pkg.get("kuliner_nama", "N/A"),
                "Estimasi Harga": pkg.get("kuliner_harga", 0),
                "Membership Degree": pkg.get("kuliner_md", 1.0)
            })
            item_rows.append(row_ks)
            
            # Kuliner Malam
            if duration > 1:
                row_km = base_row.copy()
                row_km.update({
                    "Tipe Item": "Makan Malam",
                    "Nama Tempat": pkg.get("kuliner_malam_nama", "N/A"),
                    "Estimasi Harga": pkg.get("kuliner_malam_harga", 0),
                    "Membership Degree": pkg.get("kuliner_malam_md", 1.0)
                })
                item_rows.append(row_km)
                
            # Add an empty row for visual separation between packages
            item_rows.append({"Opsi": "", "Kelas Paket": "", "Tipe Item": "", "Nama Tempat": "", "Estimasi Harga": "", "Membership Degree": ""})

    df_items = pd.DataFrame(item_rows)
    
    # 5. Sheet 2: Detail Itinerary (as before)
    detail_rows = []
    for opt in options_list:
        opt_idx = opt["option_index"]
        for pkg in opt["packages"]:
            kelas = pkg.get("kategori", "N/A").upper()
            opt_label = f"Opsi {opt_idx} - {kelas}"
            
            num_persons = pkg.get("num_persons", persons)
            num_rooms = pkg.get("num_rooms", 0)
            nights = pkg.get("nights", 0)
            duration = pkg.get("duration", duration)
            
            itin = pkg.get("itinerary", [])
            legs = pkg.get("transport_detail", {}).get("legs", [])
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "SEMUA HARI",
                "Item / Aktivitas": f"=== DETAIL ITINERARY {opt_label} ===",
                "Detail / Nama Tempat": "-",
                "Biaya (Rp)": 0,
                "Keterangan": f"Durasi {duration} Hari, {num_persons} Orang"
            })
            
            for d_num in range(1, duration + 1):
                day_label = f"Hari {d_num}"
                
                day_dict = {}
                if d_num - 1 < len(itin):
                    day_dict = itin[d_num - 1]
                
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"REKOMENDASI HARI {d_num}",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": 0,
                    "Keterangan": ""
                })
                
                h_name = day_dict.get("hotel", "Checkout")
                h_harga = day_dict.get("hotel_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Hotel",
                    "Detail / Nama Tempat": h_name,
                    "Biaya (Rp)": h_harga,
                    "Keterangan": "/malam (Status: Checkout)" if h_name == "Checkout" else f"/malam (Status: Menginap)"
                })
                
                w_name = day_dict.get("wisata", "N/A")
                w_harga = day_dict.get("wisata_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Wisata",
                    "Detail / Nama Tempat": w_name,
                    "Biaya (Rp)": w_harga,
                    "Keterangan": "/orang"
                })
                
                kp_name = day_dict.get("kuliner_pagi", "N/A")
                kp_harga = day_dict.get("kuliner_pagi_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Makan Pagi",
                    "Detail / Nama Tempat": kp_name,
                    "Biaya (Rp)": kp_harga,
                    "Keterangan": "/orang"
                })
                
                ks_name = day_dict.get("kuliner", "N/A")
                ks_harga = day_dict.get("kuliner_harga", 0)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": "Makan Siang",
                    "Detail / Nama Tempat": ks_name,
                    "Biaya (Rp)": ks_harga,
                    "Keterangan": "/orang"
                })
                
                if d_num < duration:
                    km_name = day_dict.get("kuliner_malam", "N/A")
                    km_harga = day_dict.get("kuliner_malam_harga", 0)
                    detail_rows.append({
                        "Opsi & Kelas": opt_label,
                        "Hari": day_label,
                        "Item / Aktivitas": "Makan Malam",
                        "Detail / Nama Tempat": km_name,
                        "Biaya (Rp)": km_harga,
                        "Keterangan": "/orang"
                    })
                
                h_cost_day = h_harga * num_rooms if h_name != "Checkout" else 0
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Kamar Hotel ({nights if h_name != 'Checkout' else 0} Malam)" if h_name == "Checkout" else f"• Kamar Hotel (1 Malam)",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": h_cost_day,
                    "Keterangan": ""
                })
                
                w_cost_day = w_harga * num_persons
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Tiket Wisata ({num_persons} Orang) (Hari {d_num})",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": w_cost_day,
                    "Keterangan": ""
                })
                
                meals_count = 3 if d_num < duration else 2
                k_cost_day = (kp_harga + ks_harga + (day_dict.get("kuliner_malam_harga", 0) if d_num < duration else 0)) * num_persons
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Kuliner ({num_persons} Orang × {meals_count}x Makan)",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": k_cost_day,
                    "Keterangan": ""
                })
                
                day_legs = []
                for leg in legs:
                    l_from = leg.get("from", "")
                    l_to = leg.get("to", "")
                    if f"Hari {d_num}" in l_from or f"Hari {d_num}" in l_to:
                        day_legs.append(leg)
                
                for leg in day_legs:
                    l_from = leg.get("from", "")
                    l_to = leg.get("to", "")
                    dist = leg.get("distance_km", 0)
                    cost = leg.get("cost", 0)
                    veh = leg.get("vehicle", "Motor")
                    detail_rows.append({
                        "Opsi & Kelas": opt_label,
                        "Hari": day_label,
                        "Item / Aktivitas": f"{l_from}→{l_to} ({dist} km)",
                        "Detail / Nama Tempat": "",
                        "Biaya (Rp)": cost,
                        "Keterangan": veh
                    })
                
                t_cost_day = sum(leg.get("cost", 0) for leg in day_legs)
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"• Transportasi ({'Motor' if num_persons <= 1 else 'Mobil'})",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": t_cost_day,
                    "Keterangan": ""
                })
                
                day_subtotal = h_cost_day + w_cost_day + k_cost_day + t_cost_day
                detail_rows.append({
                    "Opsi & Kelas": opt_label,
                    "Hari": day_label,
                    "Item / Aktivitas": f"Subtotal Hari {d_num}:",
                    "Detail / Nama Tempat": "",
                    "Biaya (Rp)": day_subtotal,
                    "Keterangan": ""
                })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": "🏨 Akomodasi (1 malam × 1 kamar)" if nights == 1 and num_rooms == 1 else f"🏨 Akomodasi ({nights} malam × {num_rooms} kamar)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_akomodasi", 0),
                "Keterangan": pkg.get("hotel_nama", "")
            })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🎯 Tiket Wisata ({num_persons} orang)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_wisata", 0),
                "Keterangan": pkg.get("wisata_nama", "")
            })
            
            total_meals = (duration - 1) * 3 + 2 if duration > 1 else 2
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🍜 Kuliner ({num_persons} orang × {total_meals} makan)",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_kuliner", 0),
                "Keterangan": ""
            })
            
            veh_desc = pkg.get("transport_detail", {}).get("vehicle", "Motor")
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": f"🚗 Transportasi ({veh_desc})",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("cost_transport", 0),
                "Keterangan": f"Total Jarak: {pkg.get('transport_detail', {}).get('total_distance_km', 0)} km"
            })
            
            detail_rows.append({
                "Opsi & Kelas": opt_label,
                "Hari": "RINGKASAN",
                "Item / Aktivitas": "TOTAL BIAYA PAKET",
                "Detail / Nama Tempat": "",
                "Biaya (Rp)": pkg.get("total_cost", 0),
                "Keterangan": "Estimasi Total"
            })
            
            detail_rows.append({
                "Opsi & Kelas": "", "Hari": "", "Item / Aktivitas": "", "Detail / Nama Tempat": "", "Biaya (Rp)": "", "Keterangan": ""
            })
            
    df_detail = pd.DataFrame(detail_rows)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df_meta.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=0)
        df_items.to_excel(writer, sheet_name="Rekomendasi Paket", index=False, startrow=len(df_meta) + 2)
        df_detail.to_excel(writer, sheet_name="Detail Itinerary & Biaya", index=False)
        
        if LAST_CLUSTERED is not None:
            df_hotel = LAST_CLUSTERED.get("hotel")
            if df_hotel is not None and not df_hotel.empty:
                df_hotel.to_excel(writer, sheet_name="Klaster Hotel (Kustom)", index=False)
            
            df_wisata = LAST_CLUSTERED.get("wisata")
            if df_wisata is not None and not df_wisata.empty:
                df_wisata.to_excel(writer, sheet_name="Klaster Wisata (Kustom)", index=False)
            
            df_kuliner = LAST_CLUSTERED.get("kuliner")
            if df_kuliner is not None and not df_kuliner.empty:
                df_kuliner.to_excel(writer, sheet_name="Klaster Kuliner (Kustom)", index=False)
                
    print(f"   [Excel Exported with Cluster Sheets] -> {filepath}")
"""

# Extract the body of the current function
start_idx = content.find("def export_to_excel_recom(options_list, workflow, budget, persons, duration):")
end_idx = content.find("\n\n# ============================================================\n# MAIN", start_idx)
if end_idx == -1:
    end_idx = len(content)

# Replace
new_content = content[:start_idx] + new_func + content[end_idx:]

with open('storage/app/python/recommender.py', 'w') as f:
    f.write(new_content)

