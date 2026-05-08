from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps" / "web" / "public"
OUT = ROOT / "pitch" / "slides"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
NAVY = (5, 14, 38)
DEEP = (3, 8, 22)
BLUE = (28, 121, 255)
CYAN = (29, 205, 235)
PURPLE = (125, 75, 255)
WHITE = (248, 251, 255)
MUTED = (165, 178, 205)
CARD = (13, 25, 54)
LINE = (57, 90, 150)
RED = (255, 88, 98)
GREEN = (49, 214, 154)


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F = {
    "tiny": font(26),
    "small": font(34),
    "body": font(44),
    "body_b": font(44, True),
    "sub": font(56),
    "h2": font(74, True),
    "h1": font(104, True),
    "huge": font(150, True),
}


def bg():
    img = Image.new("RGB", (W, H), DEEP)
    px = img.load()
    for y in range(H):
        for x in range(W):
            nx = x / W
            ny = y / H
            b = int(22 + 30 * nx + 8 * ny)
            g = int(10 + 25 * nx + 18 * (1 - ny))
            r = int(3 + 12 * ny)
            px[x, y] = (r, g, b)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((1180, -180, 2160, 760), fill=(23, 121, 255, 52))
    d.ellipse((-260, 520, 640, 1340), fill=(20, 210, 235, 34))
    d.ellipse((1040, 660, 2050, 1380), fill=(120, 75, 255, 36))
    layer = layer.filter(ImageFilter.GaussianBlur(80))
    img = Image.alpha_composite(img.convert("RGBA"), layer)
    d = ImageDraw.Draw(img)
    for x in range(80, W, 160):
        d.line((x, 0, x - 220, H), fill=(255, 255, 255, 10), width=1)
    return img


def trim_alpha_or_black(im):
    im = im.convert("RGBA")
    pix = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pix[x, y]
            if a == 0 or (r < 8 and g < 8 and b < 8):
                pix[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


LOGO = trim_alpha_or_black(Image.open(PUBLIC / "sinergysoldark.png"))
WORKFLOW = Image.open(PUBLIC / "Sinergy_Backned_Workflow.png").convert("RGBA")


def paste_logo(img, scale=0.18, x=96, y=70):
    logo = LOGO.copy()
    target_w = int(W * scale)
    ratio = target_w / logo.width
    logo = logo.resize((target_w, int(logo.height * ratio)), Image.LANCZOS)
    img.alpha_composite(logo, (x, y))


def text(draw, xy, s, f, fill=WHITE, anchor=None):
    draw.text(xy, s, font=f, fill=fill, anchor=anchor)


def wrap(draw, s, f, max_w):
    words = s.split()
    lines, line = [], ""
    for word in words:
        test = f"{line} {word}".strip()
        if draw.textbbox((0, 0), test, font=f)[2] <= max_w:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def paragraph(draw, xy, s, f, max_w, fill=MUTED, spacing=14):
    x, y = xy
    for line in wrap(draw, s, f, max_w):
        draw.text((x, y), line, font=f, fill=fill)
        y += f.size + spacing
    return y


def pill(draw, xy, label, color=BLUE):
    x, y = xy
    bbox = draw.textbbox((0, 0), label, font=F["tiny"])
    tw, th = bbox[2], bbox[3]
    draw.rounded_rectangle((x, y, x + tw + 42, y + th + 24), radius=28, fill=(*color, 50), outline=(*color, 180), width=2)
    draw.text((x + 21, y + 10), label, font=F["tiny"], fill=WHITE)


def save(img, name):
    path = OUT / name
    img.convert("RGB").save(path, quality=96)
    return path


def slide_1():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img)
    pill(d, (96, 250), "0:00 - 0:12  PERSONAL HOOK", CYAN)
    text(d, (96, 342), "The gap I saw", F["h1"])
    text(d, (96, 456), "firsthand", F["h1"], CYAN)
    paragraph(d, (100, 610), "A U.S. company was paying for Colombian talent through a middle layer.", F["body"], 820)
    d.rounded_rectangle((1220, 250, 1760, 830), radius=28, outline=(38, 207, 235, 110), width=3, fill=(8, 20, 48, 210))
    d.text((1490, 470), "US", font=F["huge"], fill=(255, 255, 255, 220), anchor="mm")
    d.text((1490, 625), "CO", font=F["huge"], fill=(38, 207, 235, 220), anchor="mm")
    d.line((1490, 520, 1490, 575), fill=CYAN, width=8)
    return save(img, "01_personal_hook.png")


def slide_2():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.14)
    pill(d, (96, 210), "0:12 - 0:25  THE WORK", BLUE)
    text(d, (96, 315), "We did the work.", F["h1"])
    paragraph(d, (100, 475), "The schedules. The deliverables. The client pressure. The responsibility.", F["sub"], 950, WHITE, 18)
    for i, label in enumerate(["deliverables", "clients", "responsibility"]):
        x = 1080 + i * 230
        d.rounded_rectangle((x, 380, x + 170, 550), radius=24, fill=(255, 255, 255, 18), outline=(255, 255, 255, 42), width=2)
        d.line((x + 42, 450, x + 128, 450), fill=CYAN, width=8)
        d.line((x + 85, 407, x + 85, 493), fill=CYAN, width=8)
        d.text((x + 85, 600), label, font=F["small"], fill=MUTED, anchor="mm")
    return save(img, "02_we_did_the_work.png")


def slide_3():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.14)
    pill(d, (96, 210), "0:25 - 0:38  THE REVEAL", RED)
    text(d, (96, 330), "More than 2x", F["huge"], RED)
    text(d, (104, 505), "was sent.", F["h2"], WHITE)
    text(d, (104, 595), "Much less arrived.", F["h2"], CYAN)
    d.rounded_rectangle((1120, 260, 1730, 780), radius=34, fill=(8, 20, 48, 218), outline=(255, 255, 255, 60), width=2)
    d.text((1250, 415), "$$", font=F["huge"], fill=WHITE)
    d.line((1320, 570, 1585, 570), fill=LINE, width=8)
    d.polygon([(1585, 570), (1545, 545), (1545, 595)], fill=LINE)
    d.text((1490, 680), "$", font=F["huge"], fill=CYAN, anchor="mm")
    d.text((1425, 835), "The missing value sat in the middle.", font=F["body"], fill=MUTED, anchor="mm")
    return save(img, "03_more_than_2x_gap.png")


def slide_4():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.14)
    pill(d, (96, 190), "0:38 - 0:55  MARKET PAIN", PURPLE)
    text(d, (96, 300), "Companies pay more.", F["h2"], WHITE)
    text(d, (96, 392), "Talent receives less.", F["h2"], CYAN)
    text(d, (96, 505), "Everyone loses visibility.", F["h2"], MUTED)
    labels = ["Outsourcing", "EOR", "Payroll\nintermediary", "Manual\nops"]
    for i, label in enumerate(labels):
        x = 1110 + (i % 2) * 310
        y = 300 + (i // 2) * 230
        d.rounded_rectangle((x, y, x + 250, y + 160), radius=24, fill=(8, 20, 48, 214), outline=(255, 255, 255, 58), width=2)
        d.text((x + 125, y + 80), label, font=F["small"], fill=WHITE, anchor="mm", align="center")
    d.text((960, 850), "Companies are not just paying salaries. They are paying for complexity.", font=F["body_b"], fill=WHITE, anchor="mm")
    return save(img, "04_companies_pay_complexity.png")


def slide_5():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.16)
    pill(d, (96, 220), "0:55 - 1:15  SOLUTION", GREEN)
    text(d, (96, 330), "Sinergy Sol closes", F["h1"], WHITE)
    text(d, (96, 445), "the payment gap.", F["h1"], CYAN)
    items = ["Beneficiaries", "Payment batches", "Clear fees + FX", "USDC funding", "Local payouts"]
    for i, item in enumerate(items):
        y = 610 + i * 62
        d.ellipse((105, y + 9, 127, y + 31), fill=CYAN)
        d.text((150, y), item, font=F["body"], fill=WHITE)
    d.rounded_rectangle((1050, 300, 1740, 750), radius=36, fill=(8, 20, 48, 216), outline=(49, 214, 154, 130), width=3)
    d.text((1395, 430), "Company", font=F["sub"], fill=WHITE, anchor="mm")
    d.line((1230, 530, 1560, 530), fill=GREEN, width=10)
    d.polygon([(1560, 530), (1510, 500), (1510, 560)], fill=GREEN)
    d.text((1395, 650), "LatAm talent", font=F["sub"], fill=CYAN, anchor="mm")
    return save(img, "05_sinergy_solution.png")


def slide_6():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.12, x=84, y=54)
    pill(d, (84, 165), "1:15 - 1:32  PRODUCT FLOW", BLUE)
    text(d, (84, 245), "From batch to local payout", F["h2"], WHITE)
    wf = WORKFLOW.copy()
    wf.thumbnail((1600, 720), Image.LANCZOS)
    panel = Image.new("RGBA", (wf.width + 44, wf.height + 44), (255, 255, 255, 235))
    panel.alpha_composite(wf, (22, 22))
    x = (W - panel.width) // 2
    img.alpha_composite(panel, (x, 335))
    d.rounded_rectangle((x, 335, x + panel.width, 335 + panel.height), radius=18, outline=(38, 207, 235, 130), width=4)
    return save(img, "06_product_workflow.png")


def slide_7():
    img = bg()
    d = ImageDraw.Draw(img)
    paste_logo(img, scale=0.23, x=96, y=92)
    pill(d, (96, 310), "1:32 - 1:40  CLOSE", CYAN)
    text(d, (96, 430), "Fewer intermediaries.", F["h2"], WHITE)
    text(d, (96, 525), "Less opacity.", F["h2"], CYAN)
    text(d, (96, 620), "More value for LatAm.", F["h2"], WHITE)
    d.rounded_rectangle((1040, 300, 1720, 790), radius=38, fill=(8, 20, 48, 216), outline=(255, 255, 255, 62), width=2)
    d.text((1380, 470), "GLOBAL", font=F["h2"], fill=WHITE, anchor="mm")
    d.line((1170, 575, 1590, 575), fill=CYAN, width=10)
    d.polygon([(1590, 575), (1538, 542), (1538, 608)], fill=CYAN)
    d.text((1380, 690), "LATAM", font=F["h2"], fill=CYAN, anchor="mm")
    d.text((960, 930), "Sinergy Sol closes the gap between global companies and Latin America's talent.", font=F["body_b"], fill=WHITE, anchor="mm")
    return save(img, "07_close_the_gap.png")


def main():
    paths = [slide_1(), slide_2(), slide_3(), slide_4(), slide_5(), slide_6(), slide_7()]
    manifest = OUT / "slide-timing.md"
    manifest.write_text(
        "# Sinergy Sol Pitch Slides\n\n"
        "| Slide | File | Timing | Moment |\n"
        "| --- | --- | --- | --- |\n"
        "| 1 | 01_personal_hook.png | 0:00-0:12 | Personal hook |\n"
        "| 2 | 02_we_did_the_work.png | 0:12-0:25 | The work |\n"
        "| 3 | 03_more_than_2x_gap.png | 0:25-0:38 | The gap reveal |\n"
        "| 4 | 04_companies_pay_complexity.png | 0:38-0:55 | Market pain |\n"
        "| 5 | 05_sinergy_solution.png | 0:55-1:15 | Sinergy solution |\n"
        "| 6 | 06_product_workflow.png | 1:15-1:32 | Product flow |\n"
        "| 7 | 07_close_the_gap.png | 1:32-1:40 | Close |\n",
        encoding="utf-8",
    )
    for p in paths:
        print(p)
    print(manifest)


if __name__ == "__main__":
    main()
