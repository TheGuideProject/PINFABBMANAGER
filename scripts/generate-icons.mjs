// One-off PWA icon generator: `node scripts/generate-icons.mjs`
// Renders the PINFAB mark (fin silhouette on navy) to the PNG sizes
// referenced by src/app/manifest.ts. Output is committed.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const icon = (padding) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${padding > 0 ? 0 : 96}" fill="#0f172a"/>
  <g transform="translate(${padding} ${padding}) scale(${(512 - 2 * padding) / 512})">
    <!-- fin stabilizer silhouette -->
    <path d="M96 332 C150 220 270 150 416 128 C400 220 330 312 220 352 C180 366 134 360 96 332 Z"
          fill="#38bdf8"/>
    <path d="M96 332 C150 220 270 150 416 128 C330 190 240 250 150 330 Z"
          fill="#7dd3fc" opacity="0.55"/>
    <rect x="80" y="368" width="352" height="28" rx="14" fill="#1e3a5f"/>
    <text x="256" y="468" font-family="Arial, Helvetica, sans-serif" font-size="64"
          font-weight="bold" fill="#e2e8f0" text-anchor="middle" letter-spacing="14">PINFAB</text>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, padding: 0 },
  { file: "public/icons/icon-512.png", size: 512, padding: 0 },
  // Maskable: keep artwork inside the 80% safe zone.
  { file: "public/icons/icon-maskable-512.png", size: 512, padding: 56 },
];

for (const { file, size, padding } of jobs) {
  await sharp(Buffer.from(icon(padding))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
