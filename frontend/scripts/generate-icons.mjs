// Generates the PWA icon set into public/ from an inline SVG mark.
// Run: node scripts/generate-icons.mjs   (rerun after changing the mark)
//
// The mark mirrors the in-app brand: white "M" (drawn as a path, so no font
// dependency) on the default theme's accent gradient (#3b82f6 → #2563eb).
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const outDir = resolve(new URL("..", import.meta.url).pathname, "public");

// "M" stroke path in a 512 viewBox, centered.
const M_PATH = "M 150 352 L 150 168 L 256 296 L 362 168 L 362 352";

const svg = ({ rounded, scale }) => {
  // scale < 1 shrinks the M around the canvas center (maskable safe zone).
  const transform = `translate(${256 * (1 - scale)} ${256 * (1 - scale)}) scale(${scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 115 : 0}" fill="url(#g)"/>
  <g transform="${transform}">
    <path d="${M_PATH}" fill="none" stroke="#ffffff" stroke-width="56"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
};

const targets = [
  // Regular launcher icons: rounded square (transparent corners).
  { file: "pwa-192x192.png", size: 192, rounded: true, scale: 1 },
  { file: "pwa-512x512.png", size: 512, rounded: true, scale: 1 },
  // Maskable: full-bleed background, mark kept inside the ~80% safe zone.
  { file: "maskable-icon-512x512.png", size: 512, rounded: false, scale: 0.72 },
  // iOS home screen: full-bleed square, no transparency (iOS rounds it itself).
  { file: "apple-touch-icon.png", size: 180, rounded: false, scale: 0.9 }
];

await mkdir(outDir, { recursive: true });

for (const t of targets) {
  const buffer = Buffer.from(svg({ rounded: t.rounded, scale: t.scale }));
  await sharp(buffer).resize(t.size, t.size).png().toFile(resolve(outDir, t.file));
  console.log(`✓ ${t.file} (${t.size}px)`);
}

// SVG favicon for the browser tab (crisp at any size).
await writeFile(resolve(outDir, "favicon.svg"), svg({ rounded: true, scale: 1 }), "utf8");
console.log("✓ favicon.svg");
