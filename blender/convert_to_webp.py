"""
Convert rendered PNG frames to WebP for web use.

Usage:
  python convert_to_webp.py

Requires Pillow:
  pip install Pillow
"""

import os
import glob
from PIL import Image

INPUT_FOLDER = os.path.join(os.path.expanduser('~'), 'Desktop', 'holder-frames')
OUTPUT_FOLDER = os.path.join(os.path.expanduser('~'), 'Desktop', 'holder-frames-webp')
QUALITY = 85

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

pngs = sorted(glob.glob(os.path.join(INPUT_FOLDER, '*.png')))

if not pngs:
    print(f"No PNGs found in {INPUT_FOLDER}")
    exit(1)

print(f"Converting {len(pngs)} frames to WebP (quality={QUALITY})...")

total_png = 0
total_webp = 0

for i, png_path in enumerate(pngs):
    img = Image.open(png_path)
    out_name = f"frame_{i + 1:03d}.webp"
    out_path = os.path.join(OUTPUT_FOLDER, out_name)
    img.save(out_path, 'WebP', quality=QUALITY, method=6)

    png_size = os.path.getsize(png_path)
    webp_size = os.path.getsize(out_path)
    total_png += png_size
    total_webp += webp_size

    print(f"  {os.path.basename(png_path)} -> {out_name}  ({png_size // 1024}KB -> {webp_size // 1024}KB)")

print(f"\nDone! {total_png // (1024*1024)}MB -> {total_webp // (1024*1024)}MB")
print(f"Output: {OUTPUT_FOLDER}")
print(f"\nCopy the webp files to: public/img/holder-rotation/")
