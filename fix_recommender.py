import re

with open('storage/app/python/recommender.py', 'r') as f:
    code = f.read()

# Define the new helper function for recalculating totals
helper_func = """
def recalculate_package_totals(pkg_formatted, num_persons, nights, num_rooms, w_item, datasets, total_budget):
    # Recalculate package totals to ensure 100% mathematical consistency with daily itinerary subtotals
    total_kuliner = 0.0
    itinerary_list = pkg_formatted["itinerary"]
    for day in itinerary_list:
        d_num = int(day["day"])
        pagi = float(day.get("kuliner_pagi_harga") or 0.0)
        siang = float(day.get("kuliner_harga") or 0.0)
        malam = float(day.get("kuliner_malam_harga") or 0.0) if d_num <= nights else 0.0
        total_kuliner += (pagi + siang + malam) * float(num_persons)
    pkg_formatted["cost_kuliner"] = total_kuliner

    total_hotel = 0.0
    for day in itinerary_list:
        h_name = day.get("hotel")
        if h_name and h_name != "Checkout":
            total_hotel += float(day.get("hotel_harga") or 0.0) * float(num_rooms)
    cost_h = total_hotel

    total_wisata = 0.0
    wisata_names = []
    for day in itinerary_list:
        w_name = day.get("wisata")
        w_price = float(day.get("wisata_harga") or 0.0)
        total_wisata += w_price * float(num_persons)
        if w_name and w_name != "N/A":
            if w_name not in wisata_names:
                wisata_names.append(w_name)
    cost_w = total_wisata
    pkg_formatted["cost_wisata"] = cost_w
    pkg_formatted["wisata_nama"] = " & ".join(wisata_names) if wisata_names else "N/A"

    cost_k = total_kuliner
    cost_t = float(pkg_formatted["cost_transport"])

    pkg_formatted["cost_akomodasi"] = cost_h
    pkg_formatted["cost_hotel"] = cost_h
    pkg_formatted["total_cost"] = cost_h + cost_w + cost_k + cost_t

    pkg_formatted["additional_facilities"] = _get_additional_facilities_for_wisata(w_item, datasets.get("wisata"))

    if total_budget is not None and total_budget > 0:
        pkg_formatted["budget_input"] = total_budget
        pkg_formatted["budget_remaining"] = round(total_budget - pkg_formatted["total_cost"], 2)
        pkg_formatted["selisih"] = total_budget - pkg_formatted["total_cost"]
    else:
        pkg_formatted["budget_input"] = None
        pkg_formatted["budget_remaining"] = None
        pkg_formatted["selisih"] = 0

    return pkg_formatted
"""

# Insert the helper function above generate_packages
code = code.replace("def generate_packages(", helper_func + "\ndef generate_packages(")

# Now replace the mapping phase in generate_packages
# Wait, it's better to just do this for all three workflows!
