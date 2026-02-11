import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const width = 1200;
const height = 630;

// Build SVG with dark background, TendHunt branding, lime accent
const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0A0A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#111111;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent-line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#E5FF00;stop-opacity:0" />
      <stop offset="50%" style="stop-color:#E5FF00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E5FF00;stop-opacity:0" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)" />

  <!-- Subtle grid pattern -->
  <g opacity="0.05" stroke="#FFFFFF" stroke-width="0.5">
    ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="${height}" />`).join('\n    ')}
    ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="${width}" y2="${i * 60}" />`).join('\n    ')}
  </g>

  <!-- Lime accent bar at top -->
  <rect x="0" y="0" width="${width}" height="4" fill="#E5FF00" />

  <!-- Decorative accent line -->
  <line x1="100" y1="380" x2="500" y2="380" stroke="url(#accent-line)" stroke-width="2" />

  <!-- TendHunt logo text -->
  <text x="100" y="260" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="#FFFFFF" letter-spacing="-2">
    TendHunt
  </text>

  <!-- Lime dot before tagline -->
  <circle cx="112" cy="420" r="6" fill="#E5FF00" />

  <!-- Tagline -->
  <text x="130" y="430" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#A1A1A1" letter-spacing="0">
    UK Procurement Intelligence for Suppliers
  </text>

  <!-- Bottom accent elements -->
  <rect x="100" y="520" width="80" height="4" rx="2" fill="#E5FF00" opacity="0.6" />
  <rect x="200" y="520" width="40" height="4" rx="2" fill="#E5FF00" opacity="0.3" />

  <!-- Domain -->
  <text x="1100" y="590" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#737373" text-anchor="end">
    tendhunt.com
  </text>
</svg>
`;

const outputPath = join(__dirname, '..', 'public', 'og-image.png');

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log(`OG image generated: ${outputPath}`);
