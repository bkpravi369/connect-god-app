const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MASTER_SRC = '/Users/apple/.gemini/antigravity/brain/c9e35666-1010-47b4-ab51-cb9ce73f3756/.user_uploaded/media_1788398342139.jpg';
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
  console.log('Generating Android Launcher Icons from:', MASTER_SRC);

  for (const cfg of CONFIGS) {
    const targetDir = path.join(RES_DIR, cfg.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard ic_launcher.png (Square)
    const icLauncherPath = path.join(targetDir, 'ic_launcher.png');
    await sharp(MASTER_SRC)
      .resize(cfg.size, cfg.size, { fit: 'cover' })
      .png({ quality: 100 })
      .toFile(icLauncherPath);
    console.log(`Generated ${cfg.dir}/ic_launcher.png (${cfg.size}x${cfg.size})`);

    // 2. Circular ic_launcher_round.png (Circular mask with transparent corners)
    const icRoundPath = path.join(targetDir, 'ic_launcher_round.png');
    const circleMask = Buffer.from(
      `<svg width="${cfg.size}" height="${cfg.size}"><circle cx="${cfg.size / 2}" cy="${cfg.size / 2}" r="${cfg.size / 2}" fill="black" /></svg>`
    );
    await sharp(MASTER_SRC)
      .resize(cfg.size, cfg.size, { fit: 'cover' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png({ quality: 100 })
      .toFile(icRoundPath);
    console.log(`Generated ${cfg.dir}/ic_launcher_round.png (${cfg.size}x${cfg.size}, circular mask)`);

    // 3. Adaptive Icon Foreground ic_launcher_foreground.png (108dp proportional)
    const icFgPath = path.join(targetDir, 'ic_launcher_foreground.png');
    await sharp(MASTER_SRC)
      .resize(cfg.fgSize, cfg.fgSize, { fit: 'cover' })
      .png({ quality: 100 })
      .toFile(icFgPath);
    console.log(`Generated ${cfg.dir}/ic_launcher_foreground.png (${cfg.fgSize}x${cfg.fgSize})`);
  }

  console.log('All Android mipmap launcher icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
