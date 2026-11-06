from PIL import Image
from pathlib import Path

icons_folder = Path("www/icons")

source = icons_folder / "image_20261106_140041.jpg"

image = Image.open(source).convert("RGBA")

for size in [192, 512]:
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    output = icons_folder / f"icon-{size}.png"
    resized.save(output, "PNG")
    print(f"Created: {output}")

print("Icons created successfully!")