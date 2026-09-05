const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MASTER_SRC = path.resolve(__dirname, '../assets/images/icon.png');
const ADAPTIVE_SRC = path.resolve(__dirname, '../assets/images/adaptive-icon.png');
const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

const CONFIGS = [
  { dir: 'mipmap-ldpi', size: 36, fgSize: 81 },
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generateIcons() {
  console.log('Master Icon Source:', MASTER_SRC);
  console.log('Adaptive Icon Source:', ADAPTIVE_SRC);

  if (!fs.existsSync(MASTER_SRC)) {
    throw new Error(`Master icon not found at ${MASTER_SRC}`);
  }
  if (!fs.existsSync(ADAPTIVE_SRC)) {
    throw new Error(`Adaptive icon not found at ${ADAPTIVE_SRC}`);
  }

  for (const cfg of CONFIGS) {
    const targetDir = path.join(RES_DIR, cfg.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard ic_launcher.png (Square for legacy Android / store displays)
    const icLauncherPath = path.join(targetDir, 'ic_launcher.png');
    await sharp(MASTER_SRC)
      .resize(cfg.size, cfg.size, { fit: 'cover' })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(icLauncherPath);
    console.log(`Generated ${cfg.dir}/ic_launcher.png (${cfg.size}x${cfg.size})`);

    // 2. Circular ic_launcher_round.png (Circular mask with safe-zone padded logo)
    const icRoundPath = path.join(targetDir, 'ic_launcher_round.png');
    const circleMask = Buffer.from(
      `<svg width="${cfg.size}" height="${cfg.size}"><circle cx="${cfg.size / 2}" cy="${cfg.size / 2}" r="${cfg.size / 2}" fill="black" /></svg>`
    );
    await sharp(ADAPTIVE_SRC)
      .resize(cfg.size, cfg.size, { fit: 'cover' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(icRoundPath);
    console.log(`Generated ${cfg.dir}/ic_launcher_round.png (${cfg.size}x${cfg.size}, circular mask)`);

    // 3. Adaptive Icon Foreground ic_launcher_foreground.png (108dp proportional)
    const icFgPath = path.join(targetDir, 'ic_launcher_foreground.png');
    await sharp(ADAPTIVE_SRC)
      .resize(cfg.fgSize, cfg.fgSize, { fit: 'cover' })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(icFgPath);
    console.log(`Generated ${cfg.dir}/ic_launcher_foreground.png (${cfg.fgSize}x${cfg.fgSize})`);

    // 4. Adaptive Icon Background ic_launcher_background.png (108dp solid white)
    const icBgPath = path.join(targetDir, 'ic_launcher_background.png');
    await sharp({
      create: {
        width: cfg.fgSize,
        height: cfg.fgSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(icBgPath);
    console.log(`Generated ${cfg.dir}/ic_launcher_background.png (${cfg.fgSize}x${cfg.fgSize})`);
  }

  // Update resources/ folder as well
  const resDir = path.resolve(__dirname, '../resources');
  if (fs.existsSync(resDir)) {
    fs.copyFileSync(MASTER_SRC, path.join(resDir, 'icon.png'));
    fs.copyFileSync(ADAPTIVE_SRC, path.join(resDir, 'icon-foreground.png'));
    console.log('Updated resources/icon.png and resources/icon-foreground.png');
  }

  console.log('All Android mipmap launcher icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
