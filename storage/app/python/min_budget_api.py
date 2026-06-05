import argparse
import json
import math
import numpy as np
import pandas as pd
from fcm_clustering import run_percentile_fcm
from recommender import find_k_pagi, find_k_malam, haversine_road_distance

def calculate_min_budget(persons, duration):
    # Load dataset
    df_hotel = pd.read_excel("hotel_clean.xlsx")
    df_wisata = pd.read_excel("wisata_clean.xlsx")
    df_kuliner = pd.read_excel("kuliner_clean.xlsx")

    datasets = {"hotel": df_hotel, "wisata": df_wisata, "kuliner": df_kuliner}

    # Jalankan FCM persentil (offline, tidak butuh budget input)
    clustered = {}
    for cat in ["hotel", "wisata", "kuliner"]:
        df = datasets[cat]
        prices = df["Estimasi_Harga"].values
        result = run_percentile_fcm(prices)
        df_c = df.copy()
        df_c["Cluster"] = result["labels"]
        clustered[cat] = df_c

    # Ambil klaster Hemat (0) saja
    hotels = clustered["hotel"][clustered["hotel"]["Cluster"] == 0].nsmallest(5, "Estimasi_Harga")
    wisatas = clustered["wisata"][clustered["wisata"]["Cluster"] == 0].nsmallest(5, "Estimasi_Harga")
    kuliners = clustered["kuliner"][clustered["kuliner"]["Cluster"] == 0].nsmallest(5, "Estimasi_Harga")

    nights = duration - 1
    num_rooms = math.ceil(persons / 2)
    rate_per_km = 2250 if persons <= 1 else (5150 if persons <= 4 else 6000)

    total_meals = 2 if duration == 1 else (3 * (duration - 1) + 2)

    min_total = float('inf')

    for _, h in hotels.iterrows():
        for _, w in wisatas.iterrows():
            for _, k in kuliners.iterrows():
                k_dict = k.to_dict()
                k_list = kuliners.to_dict("records")

                # Biaya akomodasi
                cost_hotel = h["Estimasi_Harga"] * nights * num_rooms if duration > 1 else 0

                # Biaya wisata
                cost_wisata = w["Estimasi_Harga"] * persons

                # Kuliner pagi & malam
                if duration == 1:
                    k_pagi = find_k_pagi(k_dict, k_list, w["Latitude"], w["Longitude"])
                    k_malam = None
                    if k_pagi is None:
                        continue  # skip kombinasi jika tidak ada kuliner pagi
                    cost_kuliner = (k_pagi["Estimasi_Harga"] + k["Estimasi_Harga"]) * persons
                else:
                    k_pagi = find_k_pagi(k_dict, k_list, h["Latitude"], h["Longitude"])
                    if k_pagi is None:
                        continue  # skip kombinasi jika tidak ada kuliner pagi
                    k_malam = find_k_malam(k_dict, k_pagi, k_list, h["Latitude"], h["Longitude"])
                    k_malam_harga = k_malam["Estimasi_Harga"] if k_malam else 0
                    cost_kuliner = ((duration - 1) * (k_pagi["Estimasi_Harga"] + k["Estimasi_Harga"] + k_malam_harga) + (k_pagi["Estimasi_Harga"] + k["Estimasi_Harga"])) * persons

                # Biaya transport
                if duration == 1:
                    kp_lat = k_pagi["Latitude"] if k_pagi else w["Latitude"]
                    kp_lon = k_pagi["Longitude"] if k_pagi else w["Longitude"]
                    d1 = haversine_road_distance(kp_lat, kp_lon, w["Latitude"], w["Longitude"])
                    d2 = haversine_road_distance(w["Latitude"], w["Longitude"], k["Latitude"], k["Longitude"])
                    total_dist = d1 + d2
                else:
                    kp_lat = k_pagi["Latitude"] if k_pagi else h["Latitude"]
                    kp_lon = k_pagi["Longitude"] if k_pagi else h["Longitude"]
                    km_lat = k_malam["Latitude"] if k_malam else h["Latitude"]
                    km_lon = k_malam["Longitude"] if k_malam else h["Longitude"]

                    # Hari 1: 5 segmen
                    dist_day1 = (
                        haversine_road_distance(kp_lat, kp_lon, w["Latitude"], w["Longitude"]) +
                        haversine_road_distance(w["Latitude"], w["Longitude"], k["Latitude"], k["Longitude"]) +
                        haversine_road_distance(k["Latitude"], k["Longitude"], h["Latitude"], h["Longitude"]) +
                        haversine_road_distance(h["Latitude"], h["Longitude"], km_lat, km_lon) +
                        haversine_road_distance(km_lat, km_lon, h["Latitude"], h["Longitude"])
                    )
                    # Hari terakhir: 3 segmen
                    dist_checkout = (
                        haversine_road_distance(h["Latitude"], h["Longitude"], kp_lat, kp_lon) +
                        haversine_road_distance(kp_lat, kp_lon, w["Latitude"], w["Longitude"]) +
                        haversine_road_distance(w["Latitude"], w["Longitude"], k["Latitude"], k["Longitude"])
                    )
                    total_dist = dist_day1 + dist_checkout

                cost_transport = round(total_dist * rate_per_km)
                total = cost_hotel + cost_wisata + cost_kuliner + cost_transport

                if total < min_total:
                    min_total = total

    # Bulatkan ke atas 50rb untuk buffer
    min_budget = math.ceil(min_total / 50000) * 50000

    return {
        "status": "success",
        "min_budget": min_budget,
        "raw_min": min_total,
        "persons": persons,
        "duration": duration
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--persons", type=int, required=True)
    parser.add_argument("--duration", type=int, required=True)
    args = parser.parse_args()

    result = calculate_min_budget(args.persons, args.duration)
    print(json.dumps(result, ensure_ascii=False))