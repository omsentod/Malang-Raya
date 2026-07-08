import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# Replace 1: scaling the input
old_scale = """    p_scaled = (prices - p_min) / (p_max - p_min + 1e-10)
    r_scaled = (ratings - r_min) / (r_max - r_min + 1e-10)
    c_scaled = (categories - c_min) / (c_max - c_min + 1e-10)"""

new_scale = """    W_p, W_r, W_c = 0.8, 0.1, 0.1
    p_scaled = ((prices - p_min) / (p_max - p_min + 1e-10)) * W_p
    r_scaled = ((ratings - r_min) / (r_max - r_min + 1e-10)) * W_r
    c_scaled = ((categories - c_min) / (c_max - c_min + 1e-10)) * W_c"""
content = content.replace(old_scale, new_scale)

# Replace 2: scaling anchors in 'budget'
old_anchor_1 = """        p_anchors_scaled = (price_anchors - p_min) / (p_max - p_min + 1e-10)
        r_anchors_scaled = (rating_anchors - r_min) / (r_max - r_min + 1e-10)
        c_anchors_scaled = (category_anchors - c_min) / (c_max - c_min + 1e-10)"""

new_anchor_1 = """        p_anchors_scaled = ((price_anchors - p_min) / (p_max - p_min + 1e-10)) * W_p
        r_anchors_scaled = ((rating_anchors - r_min) / (r_max - r_min + 1e-10)) * W_r
        c_anchors_scaled = ((category_anchors - c_min) / (c_max - c_min + 1e-10)) * W_c"""
content = content.replace(old_anchor_1, new_anchor_1, 1)

# Replace 3: scaling anchors in else
old_anchor_2 = """        p_anchors_scaled = (p_anchors - p_min) / (p_max - p_min + 1e-10)
        r_anchors_scaled = (r_anchors - r_min) / (r_max - r_min + 1e-10)
        c_anchors_scaled = (c_anchors - c_min) / (c_max - c_min + 1e-10)"""

new_anchor_2 = """        p_anchors_scaled = ((p_anchors - p_min) / (p_max - p_min + 1e-10)) * W_p
        r_anchors_scaled = ((r_anchors - r_min) / (r_max - r_min + 1e-10)) * W_r
        c_anchors_scaled = ((c_anchors - c_min) / (c_max - c_min + 1e-10)) * W_c"""
content = content.replace(old_anchor_2, new_anchor_2)

# Replace 4: descale cntr_orig_price
old_cntr = """    cntr_orig_price = cntr_scaled[:, 0] * (p_max - p_min + 1e-10) + p_min"""
new_cntr = """    cntr_orig_price = (cntr_scaled[:, 0] / W_p) * (p_max - p_min + 1e-10) + p_min"""
content = content.replace(old_cntr, new_cntr)

# Replace 5: descale all dimensions
old_orig = """    cntr_orig_sorted[:, 0] = sorted_cntr[:, 0] * (p_max - p_min + 1e-10) + p_min
    cntr_orig_sorted[:, 1] = sorted_cntr[:, 1] * (r_max - r_min + 1e-10) + r_min
    cntr_orig_sorted[:, 2] = sorted_cntr[:, 2] * (c_max - c_min + 1e-10) + c_min"""

new_orig = """    cntr_orig_sorted[:, 0] = (sorted_cntr[:, 0] / W_p) * (p_max - p_min + 1e-10) + p_min
    cntr_orig_sorted[:, 1] = (sorted_cntr[:, 1] / W_r) * (r_max - r_min + 1e-10) + r_min
    cntr_orig_sorted[:, 2] = (sorted_cntr[:, 2] / W_c) * (c_max - c_min + 1e-10) + c_min"""
content = content.replace(old_orig, new_orig)

with open('storage/app/python/recommender.py', 'w') as f:
    f.write(content)

