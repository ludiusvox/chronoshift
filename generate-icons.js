import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const resDir = path.resolve('android/app/src/main/res');

const launcherSizes = [
  { dir: 'mipmap-mdpi', size: 48, foregroundSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, foregroundSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, foregroundSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, foregroundSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, foregroundSize: 432 },
];

async function generate() {
  console.log('Generating clock launcher icons from public/icon.svg...');

  for (const item of launcherSizes) {
    const targetFolder = path.join(resDir, item.dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // 1. Generate ic_launcher.png
    await sharp(svgPath)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher.png'));

    // 2. Generate ic_launcher_round.png
    await sharp(svgPath)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

    // 3. Generate ic_launcher_foreground.png
    await sharp(svgPath)
      .resize(item.foregroundSize, item.foregroundSize)
      .png()
      .toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${item.dir}`);
  }

  // Generate PWA icons
  await sharp(svgPath).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(svgPath).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(svgPath).resize(512, 512).png().toFile('public/pwa-maskable-512x512.png');
  await sharp(svgPath).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svgPath).resize(64, 64).png().toFile('public/favicon.ico');

  console.log('All icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
