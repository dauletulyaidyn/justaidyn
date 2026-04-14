/**
 * Convert HTML banners to PNG images for social media publishing.
 * Saves PNGs in the same Banners folder with the same base name.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const BANNERS_DIR = path.join(__dirname, '..', 'Banners');
const WIDTH = 450;
const HEIGHT = 800;

const CHROME_PATHS = [
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const puppeteer = await import('puppeteer');
  const execPath = findChrome();
  const launchOpts = { headless: true };
  if (execPath) {
    launchOpts.executablePath = execPath;
    console.log('Using:', execPath);
  }
  const browser = await puppeteer.default.launch(launchOpts);

  const files = fs.readdirSync(BANNERS_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`Found ${files.length} HTML banners. Converting to PNG...`);

  for (let i = 0; i < files.length; i++) {
    const htmlFile = files[i];
    const baseName = path.basename(htmlFile, '.html');
    const pngFile = baseName + '.png';
    const htmlPath = path.join(BANNERS_DIR, htmlFile);
    const pngPath = path.join(BANNERS_DIR, pngFile);

    const fileUrl = pathToFileURL(htmlPath).href;
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      await page.screenshot({ path: pngPath, type: 'png' });
      console.log(`  [${i + 1}/${files.length}] ${pngFile}`);
    } catch (err) {
      console.error(`  ERROR ${htmlFile}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
