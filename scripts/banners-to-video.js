/**
 * Create slideshow videos 00–06 by language (RU/KK), no audio.
 * Outputs for: WhatsApp Status, Telegram Status, Instagram, YouTube Shorts, TikTok.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BANNERS_DIR = path.join(__dirname, '..', 'Banners');
const SLIDE_DURATION = 5;
// Video groups by logical range of banners
// Keys go into output filenames, values are base PNG names (without _ru/_kk).
const GROUPS = {
  '00a_06': [
    '00a_first',
    '00_first',
    '01_slogan',
    '02_ai_ne_chat',
    '03_bez_magii',
    '04_uroven',
    '05_moduli',
    '06_temy',
  ],
  '07_11': [
    '07_project1_profile',
    '08_project2_taskmanager',
    '09_project3_reshenie',
    '10_project4_avtomatizaciya',
    '11_project5_issledovanie',
  ],
  '12_25': [
    '12_dlya_vseh',
    '13_uchenyj',
    '14_pedagog',
    '15_biznesmen',
    '16_marketolog',
    '17_rukovoditel',
    '18_soiskatel',
    '19_student',
    '20_roditeli',
    '21_tvorets',
    '22_razrabotchik',
    '23_lichnyj_brend',
    '24_issledovatel',
    '25_rabota',
  ],
};
const LANGS = ['ru', 'kk'];

const PLATFORMS = {
  standard: {
    suffix: '',
    desc: 'IG, YT Shorts, TikTok, TG',
    crf: 23,
    maxSizeMb: null,
  },
  whatsapp: {
    suffix: '_wa',
    desc: 'WhatsApp Status (<5MB)',
    crf: 35,
    maxSizeMb: 5,
    maxBitrate: '1000k',
  },
};

function getImagePaths(groupKey, lang) {
  const names = GROUPS[groupKey] || [];
  return names.map(name => path.join(BANNERS_DIR, `${name}_${lang}.png`));
}

function getFfmpegPath() {
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch (_) {}
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const candidates = [
    ...pathDirs.map(p => path.join(p.trim(), 'ffmpeg.exe')),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
  ].filter(Boolean);
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function runFfmpeg(args) {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    console.error('ffmpeg not found. Run: npm install ffmpeg-static');
    return false;
  }
  const r = spawnSync(ffmpegPath, args, { stdio: 'inherit', shell: false });
  return r.status === 0;
}

function createSlideshow(imagePaths, outputPath, opts = {}) {
  const existing = imagePaths.filter(p => fs.existsSync(p));
  if (existing.length === 0) {
    console.error('No images found');
    return false;
  }

  const n = existing.length;
  const scalePad = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30';
  const filterParts = [];
  for (let i = 0; i < n; i++) {
    filterParts.push(`[${i}:v]${scalePad}[v${i}]`);
  }
  const concatInputs = Array.from({ length: n }, (_, i) => `[v${i}]`).join('');
  const filter = `${filterParts.join(';')};${concatInputs}concat=n=${n}:v=1:a=0[outv]`;

  const args = [];
  for (const p of existing) {
    args.push('-loop', '1', '-t', String(SLIDE_DURATION), '-i', p);
  }
  args.push('-filter_complex', filter, '-map', '[outv]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (opts.crf != null) args.push('-crf', String(opts.crf));
  if (opts.maxBitrate) args.push('-b:v', opts.maxBitrate, '-maxrate', opts.maxBitrate);
  args.push('-an', '-y', outputPath);

  return runFfmpeg(args);
}

function main() {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    console.error('ffmpeg not found. Install: npm install ffmpeg-static');
    process.exit(1);
  }
  console.log('Using ffmpeg:', ffmpegPath);
  console.log('\nCreating slideshow videos, no audio, by language & range...\n');

  for (const lang of LANGS) {
    for (const groupKey of Object.keys(GROUPS)) {
      const imagePaths = getImagePaths(groupKey, lang);
      if (imagePaths.some(p => !fs.existsSync(p))) {
        console.warn(
          `[${lang.toUpperCase()}][${groupKey}] Missing PNGs. Run: node scripts/banners-to-png.js\n`
        );
        continue;
      }

      for (const [platKey, plat] of Object.entries(PLATFORMS)) {
        const outName = `video_${groupKey}_${lang}${plat.suffix}.mp4`;
        const outputPath = path.join(BANNERS_DIR, outName);
        console.log(`[${lang.toUpperCase()}][${groupKey}] ${plat.desc} → ${outName}`);
        const ok = createSlideshow(imagePaths, outputPath, {
          crf: plat.crf,
          maxBitrate: plat.maxBitrate,
        });
        if (ok) {
          const stat = fs.statSync(outputPath);
          const mb = (stat.size / 1024 / 1024).toFixed(2);
          console.log(`  ✅ ${outputPath} (${mb} MB)\n`);
        } else {
          console.log(`  ❌ Failed\n`);
        }
      }
    }
  }

  console.log('Done. Upload guide:');
  console.log('  • video_*_wa.mp4       → WhatsApp Status');
  console.log('  • video_*_ru*.mp4      → Instagram, YouTube Shorts, TikTok, Telegram Status (RU)');
  console.log('  • video_*_kk*.mp4      → same platforms (Kazakh)');
}

main();
