import re

with open('storage/app/python/recommender.py', 'r') as f:
    content = f.read()

# I will write a regex to capture the formatting block inside the loop, and extract it out.
# Let's do this carefully.
