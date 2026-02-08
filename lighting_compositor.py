"""
LightingCompositor — Prepares images for Generative AI Inpainting (Imagen 3).

Takes a daytime house photo, overlays light fixture PNGs at user-selected
coordinates, and generates a composite image + dilated mask for the API.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from typing import List, Tuple, Optional


class LightingCompositor:
    """Composites light fixtures onto a house image and generates an inpainting mask."""

    def __init__(
        self,
        path_to_house: str,
        path_to_fixture: str,
        coordinates: List[Tuple[int, int]],
        scale_factor: float = 0.2,
        apply_night_filter: bool = True,
        mask_dilation_percent: float = 0.30,
    ):
        self.path_to_house = path_to_house
        self.path_to_fixture = path_to_fixture
        self.coordinates = coordinates
        self.scale_factor = scale_factor
        self.apply_night_filter = apply_night_filter
        self.mask_dilation_percent = mask_dilation_percent

        self.house: Optional[Image.Image] = None
        self.fixture: Optional[Image.Image] = None
        self.composite: Optional[Image.Image] = None
        self.mask: Optional[Image.Image] = None

    def _load_images(self) -> None:
        """Load house and fixture images from disk."""
        self.house = Image.open(self.path_to_house).convert("RGBA")
        self.fixture = Image.open(self.path_to_fixture).convert("RGBA")

    def _resize_fixture(self) -> Image.Image:
        """Resize the fixture by scale_factor, preserving aspect ratio."""
        w = max(1, int(self.fixture.width * self.scale_factor))
        h = max(1, int(self.fixture.height * self.scale_factor))
        return self.fixture.resize((w, h), Image.LANCZOS)

    def _apply_night_filter(self, img: Image.Image) -> Image.Image:
        """Darken by 50% and add a slight blue tint to simulate nighttime."""
        # Reduce brightness
        darkened = ImageEnhance.Brightness(img).enhance(0.5)

        # Blue tint overlay
        tint = Image.new("RGBA", img.size, (20, 20, 50, 80))
        return Image.alpha_composite(darkened, tint)

    def _clamp_position(
        self, cx: int, cy: int, fw: int, fh: int
    ) -> Tuple[int, int]:
        """Convert center coords to top-left, clamped within house bounds."""
        x = max(0, min(cx - fw // 2, self.house.width - fw))
        y = max(0, min(cy - fh // 2, self.house.height - fh))
        return x, y

    def build_composite(self) -> Image.Image:
        """Step A + C: Optional night filter, then paste fixtures at each coordinate."""
        self._load_images()
        fixture_resized = self._resize_fixture()

        # Optional night filter applied BEFORE pasting fixtures
        if self.apply_night_filter:
            self.composite = self._apply_night_filter(self.house.copy())
        else:
            self.composite = self.house.copy()

        fw, fh = fixture_resized.size
        for cx, cy in self.coordinates:
            x, y = self._clamp_position(cx, cy, fw, fh)
            # Use fixture alpha channel as paste mask for transparency
            self.composite.paste(fixture_resized, (x, y), fixture_resized)

        return self.composite

    def build_mask(self) -> Image.Image:
        """Step B: Black mask with dilated white regions where fixtures are placed."""
        if self.house is None:
            self._load_images()

        fixture_resized = self._resize_fixture()
        fw, fh = fixture_resized.size

        # Start with an all-black mask
        self.mask = Image.new("L", self.house.size, 0)
        draw = ImageDraw.Draw(self.mask)

        # Calculate dilation padding (30% larger than fixture on each side)
        pad_x = int(fw * self.mask_dilation_percent / 2)
        pad_y = int(fh * self.mask_dilation_percent / 2)

        for cx, cy in self.coordinates:
            x, y = self._clamp_position(cx, cy, fw, fh)
            # Draw the dilated white rectangle (fixture footprint + padding)
            x0 = max(0, x - pad_x)
            y0 = max(0, y - pad_y)
            x1 = min(self.house.width, x + fw + pad_x)
            y1 = min(self.house.height, y + fh + pad_y)
            draw.rectangle([x0, y0, x1, y1], fill=255)

        # Gaussian blur for soft edges — helps the AI blend the glow naturally
        self.mask = self.mask.filter(ImageFilter.GaussianBlur(radius=max(pad_x, pad_y) // 2 or 1))

        return self.mask

    def run(
        self,
        output_composite: str = "ready_for_ai_composite.png",
        output_mask: str = "ready_for_ai_mask.png",
    ) -> Tuple[str, str]:
        """Full pipeline: composite + mask, saved to disk."""
        composite = self.build_composite()
        mask = self.build_mask()

        # Save composite as RGB (strip alpha for API compatibility)
        composite.convert("RGB").save(output_composite)
        mask.save(output_mask)

        print(f"Composite saved → {output_composite}  ({composite.size[0]}x{composite.size[1]})")
        print(f"Mask saved     → {output_mask}  ({mask.size[0]}x{mask.size[1]})")
        print(f"Fixtures placed: {len(self.coordinates)}")
        return output_composite, output_mask


# ---------------------------------------------------------------------------
# Test with dummy images
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Create a dummy white "house" (800x600)
    house = Image.new("RGB", (800, 600), (240, 240, 240))
    draw_h = ImageDraw.Draw(house)
    # Simple house shape for visual reference
    draw_h.polygon([(200, 300), (400, 100), (600, 300)], fill=(180, 140, 100))  # roof
    draw_h.rectangle([250, 300, 550, 500], fill=(200, 180, 160))               # wall
    draw_h.rectangle([350, 380, 450, 500], fill=(120, 80, 60))                 # door
    house.save("_test_house.png")

    # Create a dummy fixture: small red circle on transparent background
    fixture = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    draw_f = ImageDraw.Draw(fixture)
    draw_f.ellipse([10, 10, 90, 90], fill=(200, 160, 50, 230))  # warm bronze circle
    fixture.save("_test_fixture.png")

    # Place fixtures at 4 positions along the front of the "house"
    coords = [
        (280, 490),  # left of door
        (520, 490),  # right of door
        (200, 350),  # left wall
        (600, 350),  # right wall
    ]

    compositor = LightingCompositor(
        path_to_house="_test_house.png",
        path_to_fixture="_test_fixture.png",
        coordinates=coords,
        scale_factor=0.2,
        apply_night_filter=True,
    )

    comp_path, mask_path = compositor.run()
    print(f"\nDone! Open {comp_path} and {mask_path} to inspect results.")
