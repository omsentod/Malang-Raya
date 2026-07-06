import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import skfuzzy as fuzz

# Set up paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, 'datasets')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_data():
    datasets = {}
    
    file_map = {
        'hotel': 'hotel_clean.xlsx',
        'wisata': 'wisata_clean.xlsx',
        'kuliner': 'tempat_makan_clean.xlsx'
    }
    
    for cat, filename in file_map.items():
        file_path = os.path.join(DATASET_DIR, filename)
        df = pd.read_excel(file_path)
        # Add a column to identify the category
        df['Kategori_Tipe'] = cat.capitalize()
        datasets[cat] = df
    return datasets

def plot_spatial(df_all):
    plt.figure(figsize=(10, 8))
    sns.scatterplot(
        data=df_all, 
        x='Longitude', 
        y='Latitude', 
        hue='Kategori_Tipe', 
        palette={'Hotel': 'red', 'Wisata': 'blue', 'Kuliner': 'green'},
        alpha=0.7,
        s=60
    )
    plt.title('Scatter Plot Kedekatan Spasial (Geografis) Malang Raya', fontsize=14, fontweight='bold')
    plt.xlabel('Longitude', fontsize=12)
    plt.ylabel('Latitude', fontsize=12)
    plt.legend(title='Jenis Tempat')
    plt.grid(True, linestyle='--', alpha=0.5)
    
    # Save the plot
    output_path = os.path.join(OUTPUT_DIR, 'scatter_spasial.png')
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Berhasil menyimpan: {output_path}")

def plot_attribute(df_all):
    plt.figure(figsize=(10, 8))
    sns.scatterplot(
        data=df_all, 
        x='Estimasi_Harga', 
        y='Rating', 
        hue='Kategori_Tipe', 
        palette={'Hotel': 'red', 'Wisata': 'blue', 'Kuliner': 'green'},
        alpha=0.7,
        s=60
    )
    plt.title('Scatter Plot Kedekatan Atribut (Harga vs Rating)', fontsize=14, fontweight='bold')
    plt.xlabel('Estimasi Harga (Rp)', fontsize=12)
    plt.ylabel('Rating', fontsize=12)
    plt.legend(title='Jenis Tempat')
    plt.grid(True, linestyle='--', alpha=0.5)
    
    # Save the plot
    output_path = os.path.join(OUTPUT_DIR, 'scatter_atribut.png')
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Berhasil menyimpan: {output_path}")

def run_fcm_for_viz(df):
    prices = df["Estimasi_Harga"].values.astype(float)
    ratings = df["Rating"].values.astype(float) if "Rating" in df.columns else np.full(len(prices), 4.0)
    
    p_min, p_max = prices.min(), prices.max()
    r_min, r_max = ratings.min(), ratings.max()
    
    p_scaled = (prices - p_min) / (p_max - p_min + 1e-10)
    r_scaled = (ratings - r_min) / (r_max - r_min + 1e-10)
    
    categories = df.get("Nilai_Numerik", np.zeros(len(prices))).values.astype(float)
    c_min, c_max = categories.min(), categories.max()
    c_scaled = (categories - c_min) / (c_max - c_min + 1e-10)
    
    X = np.column_stack([p_scaled, r_scaled, c_scaled]).T 
    
    # Run FCM c=2
    cntr, u, u0, d, jm, p, fpc = fuzz.cluster.cmeans(
        X, c=2, m=2.0, error=0.005, maxiter=1000, init=None
    )
    
    price_cntr = cntr[:, 0]
    
    if price_cntr[0] > price_cntr[1]:
        u_hemat = u[1, :]
        u_premium = u[0, :]
    else:
        u_hemat = u[0, :]
        u_premium = u[1, :]
        
    return u_hemat, u_premium

def plot_membership(datasets):
    plt.figure(figsize=(10, 8))
    
    colors = {'hotel': 'red', 'wisata': 'blue', 'kuliner': 'green'}
    
    for cat, df in datasets.items():
        df_clean = df.copy()
        df_clean['Estimasi_Harga'] = pd.to_numeric(df_clean['Estimasi_Harga'], errors='coerce')
        df_clean['Rating'] = pd.to_numeric(df_clean['Rating'], errors='coerce')
        
        df_clean = df_clean.dropna(subset=['Estimasi_Harga', 'Rating'])
        if len(df_clean) > 0:
            u_h, u_p = run_fcm_for_viz(df_clean)
            sns.scatterplot(
                x=u_h, 
                y=u_p, 
                color=colors[cat],
                label=cat.capitalize(),
                alpha=0.6,
                s=50
            )
            
    plt.title('Scatter Plot Kedekatan Keanggotaan (U_Hemat vs U_Premium)', fontsize=14, fontweight='bold')
    plt.xlabel('Derajat Keanggotaan (U_Hemat)', fontsize=12)
    plt.ylabel('Derajat Keanggotaan (U_Premium)', fontsize=12)
    plt.legend(title='Jenis Tempat')
    plt.grid(True, linestyle='--', alpha=0.5)
    
    x_line = np.linspace(0, 1, 100)
    plt.plot(x_line, 1 - x_line, color='gray', linestyle=':', label='Garis Batas (U_H + U_P = 1)')
    
    output_path = os.path.join(OUTPUT_DIR, 'scatter_membership.png')
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Berhasil menyimpan: {output_path}")

if __name__ == "__main__":
    print("Memuat dataset...")
    datasets = load_data()
    
    df_all = pd.concat([datasets['hotel'], datasets['wisata'], datasets['kuliner']], ignore_index=True)
    
    df_all['Estimasi_Harga'] = pd.to_numeric(df_all['Estimasi_Harga'], errors='coerce')
    df_all['Rating'] = pd.to_numeric(df_all['Rating'], errors='coerce')
    df_all['Latitude'] = pd.to_numeric(df_all['Latitude'], errors='coerce')
    df_all['Longitude'] = pd.to_numeric(df_all['Longitude'], errors='coerce')
    
    print("Membuat Scatter Plot Spasial...")
    plot_spatial(df_all)
    
    print("Membuat Scatter Plot Atribut (Harga vs Rating)...")
    plot_attribute(df_all)
    
    print("Membuat Scatter Plot Keanggotaan (U_Hemat vs U_Premium)...")
    plot_membership(datasets)
    
    print("Selesai!")
