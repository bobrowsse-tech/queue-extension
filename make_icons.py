from PIL import Image, ImageDraw
import os

BG = (242, 169, 59, 255)      # amber #F2A93B
FG = (20, 23, 28, 255)        # charcoal #14171C

def rounded_square(size):
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(s * 0.28)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)

    # Play triangle, slightly right of center (optical centering)
    w, h = s, s
    tri_h = h * 0.44
    tri_w = tri_h * 0.86
    cx, cy = w * 0.47, h * 0.5
    p1 = (cx - tri_w * 0.5, cy - tri_h * 0.5)
    p2 = (cx - tri_w * 0.5, cy + tri_h * 0.5)
    p3 = (cx + tri_w * 0.62, cy)
    d.polygon([p1, p2, p3], fill=FG)

    # Small queue dot (bottom-right) representing "saved to list" — only visible at larger sizes
    if size >= 48:
        r = s * 0.085
        cx2, cy2 = s * 0.80, s * 0.80
        d.ellipse([cx2 - r, cy2 - r, cx2 + r, cy2 + r], fill=FG)

    img = img.resize((size, size), Image.LANCZOS)
    return img

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(out_dir, exist_ok=True)
for size in (16, 32, 48, 128):
    im = rounded_square(size)
    im.save(os.path.join(out_dir, f"icon{size}.png"))
print("Wrote icons to", out_dir)
