const fs = require('fs');

const raw = fs.readFileSync('storage/app/python/output/hasil-rekomendasi/rekomendasi_flexible_20260529_203235_btanpa_budget_p2_d2.json', 'utf8');
const data = JSON.parse(raw);
const allOptions = data.data || [];

function getWisataAlternativesForTier(classIdx, dayNum) {
    const list = [];
    if (!allOptions) return list;
    allOptions.forEach(opt => {
        const pkg = opt.packages[classIdx];
        if (!pkg) return;
        if (pkg.itinerary && pkg.itinerary.length > 0) {
            const itin = pkg.itinerary.find(it => it.day === dayNum);
            if (itin && !list.some(w => w.nama === itin.wisata)) {
                list.push({
                    nama: itin.wisata,
                    harga: itin.wisata_harga,
                    lat: itin.wisata_lat || 0,
                    lon: itin.wisata_lon || 0
                });
            }
        } else if (dayNum === 1) {
            if (pkg.wisata_nama && !list.some(w => w.nama === pkg.wisata_nama)) {
                list.push({
                    nama: pkg.wisata_nama,
                    harga: pkg.wisata_harga,
                    lat: pkg.wisata_lat || 0,
                    lon: pkg.wisata_lon || 0
                });
            }
        }
    });
    return list;
}

console.log("Tier 0 Day 1 Wisata:", getWisataAlternativesForTier(0, 1));
