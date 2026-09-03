import { COLORS } from './theme';

export const APP_NAME = 'Connect GOD';
export const APP_TAGLINE = 'BK Kozhikode Official App';
export const ADMIN_PASSWORD = '1234';
export const ADMIN_PIN = '1234';
export const APP_LOGO = '/images/channel-logos/connect_god_logo.png';

export type ChecklistItem = {
  key: string;
  label: string;
  labelEn: string;
  type: 'checkbox' | 'number' | 'percent';
  unit?: string;
  hint?: string;
};

export const DEFAULT_ITEMS: ChecklistItem[] = [
  // 1
  { key: 'good_morning', label: 'ഗുഡ്മോർണിംഗ്', labelEn: 'Good Morning', type: 'checkbox' },
  // 2 — percentage option
  { key: 'amritavela', label: 'അമൃതവേള', labelEn: 'Amrit Vela', type: 'percent' },
  // 3 — numeric badge input (time in minutes)
  { key: 'exercise', label: 'ശരീര വ്യായാമം', labelEn: 'Physical Exercise', type: 'number', unit: 'min' },
  // 4 — numeric badge input
  { key: 'traffic_control', label: 'ട്രാഫിക് കൺട്രോൾ', labelEn: 'Traffic Control', type: 'number', unit: 'x' },
  // 5
  { key: 'murali_points', label: 'മുരളി, പോയിന്റുകൾ', labelEn: 'Murali Points', type: 'checkbox' },
  // 6 — percentage option
  { key: 'food_timing', label: 'ആഹാര സമയത്തെ ഓർമ്മ', labelEn: 'Remember Food Timing', type: 'percent' },
  // 7 — numeric badge input
  { key: 'pancha_swaroopam', label: 'പഞ്ച സ്വരൂപം (എണ്ണം)', labelEn: 'Pancha Swaroopam (count)', type: 'number', unit: 'x', hint: 'Count' },
  // 8 — percentage option
  { key: 'sandhya_yoga', label: 'സന്ധ്യാ യോഗ', labelEn: 'Sandhya Yoga', type: 'percent' },
  // 9
  { key: 'avyakta_murali', label: 'അവ്യക്ത മുരളി', labelEn: 'Avyakta Murali', type: 'checkbox' },
  // 10
  { key: 'manasa_seva', label: 'മനസാ സേവ', labelEn: 'Manasa Seva', type: 'checkbox' },
  // 11
  { key: 'baba_letter', label: 'ബാബയ്ക്ക് കത്ത്', labelEn: 'Letter to Baba', type: 'checkbox' },
  // 12
  { key: 'good_night', label: 'ഗുഡ് നൈറ്റ്', labelEn: 'Good Night', type: 'checkbox' },
  // 13 — numeric badge input
  { key: 'ashariiri', label: 'അശരീരി (50 തവണ)', labelEn: 'Ashariiri (50 times)', type: 'number', unit: 'x', hint: 'Count' },
  // 14 — numeric badge input
  { key: 'safalta', label: 'സഫലത എന്റെ ജന്മസിദ്ധ അധികാരമാണ്', labelEn: 'Success is my birthright', type: 'number', unit: 'x' },
  // 15
  { key: 'swamanam', label: 'സ്വമാനം', labelEn: 'Self-respect', type: 'checkbox' },
  // 16 — total yoga time in hours
  { key: 'total_yoga_time', label: 'ടോട്ടൽ യോഗ സമയം', labelEn: 'Total Yoga Time', type: 'number', unit: 'hrs' },
];

export type PresetAlarm = {
  time: string;
  label: string;
  labelMl?: string;
  slotKey?: string;
};

export const DEFAULT_TRAFFIC_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1_vx-B1w5TDjaQsDyw-JDq2VnevpfdyzD';

export type TrafficTrackSlot = {
  slotKey: string;
  time: string;
  titleEn: string;
  titleMl: string;
  filename: string;
  driveUrl?: string;
  isChime?: boolean;
};

export const TRAFFIC_TRACK_SLOTS: TrafficTrackSlot[] = [
  {
    slotKey: 'amritvela',
    time: '03:30',
    titleEn: 'Amritvela',
    titleMl: 'അമൃതവേള',
    filename: '01. 3.30 am.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_amritvela_330am/view',
  },
  {
    slotKey: 'early_morning',
    time: '05:45',
    titleEn: 'Early Morning Yoga',
    titleMl: 'പ്രഭാത യോഗ',
    filename: '02. 5.45 am.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_early_morning_545am/view',
  },
  {
    slotKey: 'morning',
    time: '07:00',
    titleEn: 'Morning Study',
    titleMl: 'പ്രഭാത പഠനം',
    filename: '03. 7.00 am.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_morning_700am/view',
  },
  {
    slotKey: 'mid_morning',
    time: '10:30',
    titleEn: 'Mid-Morning Traffic Control',
    titleMl: 'മധ്യാഹ്ന ട്രാഫിക് കൺട്രോൾ',
    filename: '04. 10.30 am.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_mid_morning_1030am/view',
  },
  {
    slotKey: 'noon',
    time: '12:00',
    titleEn: 'Noon Remembrance',
    titleMl: 'മധ്യാഹ്ന ഓർമ്മ',
    filename: '05. 12 pm.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_noon_1200pm/view',
  },
  {
    slotKey: 'evening',
    time: '17:30',
    titleEn: 'Evening Sandhya Yoga',
    titleMl: 'സന്ധ്യാ യോഗ',
    filename: '06. 5.30 pm.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_evening_530pm/view',
  },
  {
    slotKey: 'dusk',
    time: '19:30',
    titleEn: 'Dusk Class & Meditation',
    titleMl: 'സന്ധ്യാ ക്ലാസ്സ് / ധ്യാനം',
    filename: '07.  07.30 pm.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_dusk_730pm/view',
  },
  {
    slotKey: 'night',
    time: '21:30',
    titleEn: 'Night Reflection',
    titleMl: 'രാത്രി ധ്യാനം',
    filename: '08. 9.30pm.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_night_930pm/view',
  },
  {
    slotKey: 'late_night',
    time: '22:00',
    titleEn: 'Night Meditation',
    titleMl: 'ശയന സമർപ്പണം',
    filename: '10. 10 pm.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_night_1000pm/view',
  },
  {
    slotKey: 'hourly_chime',
    time: 'hourly',
    titleEn: 'Hourly Chimes Tone',
    titleMl: 'മണിക്കൂർ ചിഹ്ന സംഗീതം',
    filename: '09. Hourly chimes.mp3',
    driveUrl: 'https://drive.google.com/file/d/1_hourly_chimes/view',
    isChime: true,
  },
];

export const PRESET_ALARMS: PresetAlarm[] = [
  { time: '03:30', label: 'Amritvela', labelMl: 'അമൃതവേള', slotKey: 'amritvela' },
  { time: '05:45', label: 'Early Morning Yoga', labelMl: 'പ്രഭാത യോഗ', slotKey: 'early_morning' },
  { time: '07:00', label: 'Morning Study', labelMl: 'പ്രഭാത പഠനം', slotKey: 'morning' },
  { time: '10:30', label: 'Mid-Morning Traffic Control', labelMl: 'മധ്യാഹ്ന ട്രാഫിക് കൺട്രോൾ', slotKey: 'mid_morning' },
  { time: '12:00', label: 'Noon Remembrance', labelMl: 'മധ്യാഹ്ന ഓർമ്മ', slotKey: 'noon' },
  { time: '17:30', label: 'Evening Sandhya Yoga', labelMl: 'സന്ധ്യാ യോഗ', slotKey: 'evening' },
  { time: '19:30', label: 'Dusk Class & Meditation', labelMl: 'സന്ധ്യാ ക്ലാസ്സ്', slotKey: 'dusk' },
  { time: '21:30', label: 'Night Reflection', labelMl: 'രാത്രി ധ്യാനം', slotKey: 'night' },
  { time: '22:00', label: 'Night Meditation', labelMl: 'ശയന സമർപ്പണം', slotKey: 'late_night' },
];

export const HOURLY_TRAFFIC_TIMES = [
  '06:00', // 6:00 AM
  '08:00', // 8:00 AM
  '09:00', // 9:00 AM
  '11:00', // 11:00 AM
  '13:00', // 1:00 PM
  '14:00', // 2:00 PM
  '15:00', // 3:00 PM
  '16:00', // 4:00 PM
  '18:00', // 6:00 PM
  '20:30', // 8:30 PM
];

export type Ringtone = { key: string; label: string };

export const RINGTONES: Ringtone[] = [
  { key: 'default', label: 'Temple Bell' },
  { key: 'soft', label: 'Soft Chime' },
  { key: 'flute', label: 'Bamboo Flute' },
  { key: 'om', label: 'Om Chant' },
  { key: 'birds', label: 'Morning Birds' },
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export type Channel = {
  id: string;
  name: string;
  nameMl?: string;
  description?: string;
  youtubeUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  pinterestUrl: string;
  thumbnail: string;
  logo: string;
  accent: string;
  initials: string;
  featuredVideoId?: string;
  featuredVideoTitle?: string;
};

export const CHANNELS: Channel[] = [
  {
    id: 'bks-calicut',
    name: 'BK S Calicut Live',
    nameMl: 'ബികെഎസ് കോഴിക്കോട് ലൈവ്',
    description: 'Daily Live Murli, Morning Classes, and Spiritual Discourses from Calicut center.',
    youtubeUrl: 'https://youtube.com/@bkscalicut9425',
    instagramUrl: 'https://instagram.com/bkscalicut',
    facebookUrl: 'https://facebook.com/bkscalicut',
    pinterestUrl: 'https://pinterest.com/bkscalicut',
    thumbnail: 'https://images.pexels.com/photos/7458079/pexels-photo-7458079.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
    logo: '/images/channel-logos/bks_calicut_logo.jpg',
    accent: COLORS.primary[700],
    initials: 'BC',
    featuredVideoId: 'u31qwQUeGuM',
    featuredVideoTitle: 'Live Daily Murli Class & Meditation',
  },
  {
    id: 'supreme-light',
    name: 'Supreme Light Creations',
    nameMl: 'സുപ്രീം ലൈറ്റ് ക്രിയേഷൻസ്',
    description: 'Deep spiritual podcasts, soul realization series, and transformative reflections.',
    youtubeUrl: 'https://youtube.com/@supremelightcreations',
    instagramUrl: 'https://instagram.com/supremelightcreations',
    facebookUrl: 'https://facebook.com/supremelightcreations',
    pinterestUrl: 'https://pinterest.com/supremelightcreations',
    thumbnail: 'https://i.ytimg.com/vi/8_UXOgXz7MA/hqdefault.jpg',
    logo: '/images/channel-logos/Supremelight_creation_logo_new.png',
    accent: COLORS.accent[600],
    initials: 'SL',
    featuredVideoId: '8_UXOgXz7MA',
    featuredVideoTitle: 'Daily Murli Malayalam Podcast - Supreme Light',
  },
  {
    id: 'bk-sheeba',
    name: 'BK Sheeba',
    nameMl: 'ബികെ ഷീബ',
    description: 'Rajayoga meditation experiences, spiritual lectures, and lifestyle guidance by BK Sheeba.',
    youtubeUrl: 'https://youtube.com/@BKSheeba',
    instagramUrl: 'https://instagram.com/bksheeba',
    facebookUrl: 'https://facebook.com/bksheeba',
    pinterestUrl: 'https://pinterest.com/bksheeba',
    thumbnail: 'https://i.ytimg.com/vi/_kKSsaZaklI/hqdefault.jpg',
    logo: '/images/channel-logos/BK_sheeba_logo.png',
    accent: COLORS.primary[600],
    initials: 'BS',
    featuredVideoId: '_kKSsaZaklI',
    featuredVideoTitle: 'Think This Way, And You Can Manifest Anything - BK Sheeba',
  },
  {
    id: 'bk-sheeja',
    name: 'BK Sheeja',
    nameMl: 'ബികെ ഷീജ',
    description: 'Heart-touching songs, spiritual commentary, and empowering classes by BK Sheeja.',
    youtubeUrl: 'https://youtube.com/@BKSheeja',
    instagramUrl: 'https://instagram.com/bksheeja',
    facebookUrl: 'https://facebook.com/bksheeja',
    pinterestUrl: 'https://pinterest.com/bksheeja',
    thumbnail: 'https://i.ytimg.com/vi/tiKb43faieY/hqdefault.jpg',
    logo: '/images/channel-logos/BK_Sheeja_real.png',
    accent: COLORS.secondary[500],
    initials: 'BJ',
    featuredVideoId: 'tiKb43faieY',
    featuredVideoTitle: 'Spiritual Class & Meditation - BK Sheeja',
  },
];

// 2x2 Clean YouTube Thumbnail Grid items
export const FEATURED_VIDEOS = [
  {
    id: 'bks-calicut-live',
    channelId: 'bks-calicut',
    title: 'BK S Calicut Live',
    subtitle: 'Daily Live Murli & Meditation',
    thumbnail: 'https://i.ytimg.com/vi/Tc-LnD4pbek/hqdefault.jpg',
    url: 'https://youtube.com/@bkscalicut9425',
    badge: 'LIVE',
    badgeColor: COLORS.error[500],
    videoId: 'Tc-LnD4pbek',
  },
  {
    id: 'supreme-light-podcast',
    channelId: 'supreme-light',
    title: 'Supreme Light Creations',
    subtitle: 'Spiritual Wisdom Podcast',
    thumbnail: 'https://i.ytimg.com/vi/8_UXOgXz7MA/hqdefault.jpg',
    url: 'https://youtube.com/@supremelightcreations',
    badge: 'PODCAST',
    badgeColor: COLORS.primary[600],
    videoId: '8_UXOgXz7MA',
  },
  {
    id: 'bk-sheeba-video',
    channelId: 'bk-sheeba',
    title: 'BK Sheeba',
    subtitle: 'Meditation & Spiritual Wisdom',
    thumbnail: 'https://i.ytimg.com/vi/_kKSsaZaklI/hqdefault.jpg',
    url: 'https://youtube.com/@BKSheeba',
    badge: 'CLASSES',
    badgeColor: COLORS.secondary[600],
    videoId: '_kKSsaZaklI',
  },
  {
    id: 'bk-sheeja-video',
    channelId: 'bk-sheeja',
    title: 'BK Sheeja',
    subtitle: 'Divine Classes & Meditation',
    thumbnail: 'https://i.ytimg.com/vi/tiKb43faieY/hqdefault.jpg',
    url: 'https://youtube.com/@BKSheeja',
    badge: 'MEDITATION',
    badgeColor: COLORS.accent[600],
    videoId: 'tiKb43faieY',
  },
];

export type ZoomConfig = {
  meetingId: string;
  password?: string;
  joinUrl: string;
};

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  meetingId: '5043349232',
  password: 'N3c3VHFzWjRJMTV2UTJqY001SFI1dz09',
  joinUrl: 'https://us02web.zoom.us/j/5043349232?pwd=N3c3VHFzWjRJMTV2UTJqY001SFI1dz09',
};

export const ZOOM_CONFIG: ZoomConfig = DEFAULT_ZOOM_CONFIG;

// ── Dynamic content types ──────────────────────────────────────────────

export type MediaCategory = 'commentary' | 'music' | 'song';
export type SongSubCategory = 'all' | 'malayalam' | 'hindi' | 'others';

export type MeditationItem = {
  id: string;
  title: string;
  category: 'commentary' | 'music' | 'song' | 'ringtone';
  subCategory?: 'malayalam' | 'hindi' | 'others';
  folderPath?: string;
  filename?: string;
  driveUrl: string;
  streamUrl?: string;
  downloadUrl?: string;
  subtitle?: string;
};

export const DEFAULT_MEDITATION_ITEMS: MeditationItem[] = [
  // ── Commentaries (21 authentic tracks) ──
  { id: 'comm_01', title: 'First Day Meditation', category: 'commentary', subtitle: 'ഒന്നാം ദിന ധ്യാനം (ആത്മീയ അനുഭൂതി)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316060/01_1st_DAY.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316060/01_1st_DAY.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316060/01_1st_DAY.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: '01 1st DAY.mp3' },
  { id: 'comm_02', title: 'Second Day Meditation', category: 'commentary', subtitle: 'രണ്ടാം ദിന ധ്യാനം (പരമാത്മ സ്മരണ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/02_2nd_DAY.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: '02 2nd DAY.mp3' },
  { id: 'comm_03', title: 'Third Day Meditation', category: 'commentary', subtitle: 'മൂന്നാം ദിന ധ്യാനം (കർമ്മയോഗ സ്ഥിതി)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/03_3rd_DAY.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: '03 3rd DAY.mp3' },
  { id: 'comm_04', title: 'Fourth Day Commentary', category: 'commentary', subtitle: 'നാലാം ദിന കമന്ററി (ദിവ്യ ഗുണങ്ങൾ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/04_DAY_COMMENTARY.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: '04 DAY COMMENTARY.mp3' },
  { id: 'comm_05', title: 'Adisakthi Yoga - BK Sheeba', category: 'commentary', subtitle: 'ആദിശക്തി യോഗ (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/ADISAKTHI_YOGA_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/ADISAKTHI_YOGA_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316051/ADISAKTHI_YOGA_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'ADISAKTHI YOGA BY B.K SHEEBA.mp3' },
  { id: 'comm_06', title: 'Bhagyasali Atma - BK Sheeba', category: 'commentary', subtitle: 'ഭാഗ്യശാലീ ആത്മാവ് (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316100/BHAGYASALI_ATMA_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316100/BHAGYASALI_ATMA_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316100/BHAGYASALI_ATMA_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'BHAGYASALI ATMA BY B.K SHEEBA.mp3' },
  { id: 'comm_07', title: 'Chakra Yoga Stage 2', category: 'commentary', subtitle: 'ചക്ര യോഗ ഭാഗം 2 (ഊർജ്ജ ഉണർവ്)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316126/CHAKRA_YOGA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316126/CHAKRA_YOGA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316126/CHAKRA_YOGA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'CHAKRA YOGA.mp3' },
  { id: 'comm_08', title: 'Chakra Yoga Meditation', category: 'commentary', subtitle: 'ചക്ര യോഗ ധ്യാനം (ആത്മീയ ശുദ്ധി)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316097/CHAKRA_YOGA_NEW.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316097/CHAKRA_YOGA_NEW.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316097/CHAKRA_YOGA_NEW.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'CHAKRA YOGA NEW.mp3' },
  { id: 'comm_09', title: 'Char Dham Commentary', category: 'commentary', subtitle: 'ചാർ ധാം ആത്മീയ യാത്ര', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/Char_dham_commentry.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'Char dham commentry.mp3' },
  { id: 'comm_10', title: 'Durga Yoga Meditation', category: 'commentary', subtitle: 'ദുർഗ്ഗാ സ്വരൂപ ഭട്ടി കമന്ററി', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787317291/DURGA_YOGA_NEW.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787317291/DURGA_YOGA_NEW.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787317291/DURGA_YOGA_NEW.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'DURGA YOGA NEW.mp3' },
  { id: 'comm_11', title: 'Jwalamukhi Yoga New', category: 'commentary', subtitle: 'ജ്വാലാമുഖീ യോഗ (തപസ്യ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI_NEW.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI_NEW.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/JWALAMUKHI_NEW.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'JWALAMUKHI NEW.mp3' },
  { id: 'comm_12', title: 'Jwalamukhi Yog - BK Sheeba', category: 'commentary', subtitle: 'ജ്വാലാമുഖീ യോഗം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316132/JWALAMUKHI_YOG_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316132/JWALAMUKHI_YOG_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316132/JWALAMUKHI_YOG_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'JWALAMUKHI YOG BY B.K SHEEBA.mp3' },
  { id: 'comm_13', title: 'Jwalamukhi Tapasya', category: 'commentary', subtitle: 'ജ്വാലാമുഖീ തപസ്യ', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Jwalamukhi.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Jwalamukhi.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/Jwalamukhi.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'Jwalamukhi.mp3' },
  { id: 'comm_14', title: 'Lakshmi Yoga Meditation', category: 'commentary', subtitle: 'മഹാലക്ഷ്മീ യോഗം (ഐശ്വര്യ പ്രാപ്തി)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316089/LAKSHMI_YOGA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316089/LAKSHMI_YOGA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316089/LAKSHMI_YOGA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'LAKSHMI YOGA.mp3' },
  { id: 'comm_15', title: 'Lakshmi Yoga Short', category: 'commentary', subtitle: 'ലക്ഷ്മീ യോഗം ലഘു ധ്യാനം', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Lakshmi_Yoga_Short.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Lakshmi_Yoga_Short.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/Lakshmi_Yoga_Short.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'Lakshmi Yoga Short.mp3' },
  { id: 'comm_16', title: 'Pancha Thathwa Yoga - BK Sheeba', category: 'commentary', subtitle: 'പഞ്ചതത്വ യോഗം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'PANCHA THATHWA YOGA BY B.K SHEEBA.mp3' },
  { id: 'comm_17', title: 'Panchaswaroop Meditation', category: 'commentary', subtitle: 'പഞ്ചസ്വരൂപ അഭ്യാസ ധ്യാനം', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/PANCHASWARUPmp3.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'PANCHASWARUPmp3.mp3' },
  { id: 'comm_18', title: 'Pavithra Swaroopam - BK Sheeba', category: 'commentary', subtitle: 'പവിത്ര സ്വരൂപം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316056/PAVITHRA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316056/PAVITHRA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316056/PAVITHRA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'PAVITHRA SWAROOPAM BY B.K SHEEBA SISTER.mp3' },
  { id: 'comm_19', title: 'Sneha Swaroopam - BK Sheeba', category: 'commentary', subtitle: 'സ്നേഹ സ്വരൂപം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/SNEHA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/SNEHA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/SNEHA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'SNEHA SWAROOPAM BY B.K SHEEBA SISTER.mp3' },
  { id: 'comm_20', title: 'Vighna Vinasaka Yoga - BK Sheeba', category: 'commentary', subtitle: 'വിഘ്നവിനാശക യോഗം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316173/VIGHNA_VINASAKA_YOGA_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316173/VIGHNA_VINASAKA_YOGA_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316173/VIGHNA_VINASAKA_YOGA_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'VIGHNA VINASAKA YOGA BY B.K SHEEBA.mp3' },
  { id: 'comm_21', title: 'Vishnu Swarup - BK Sheeba', category: 'commentary', subtitle: 'വിഷ്ണു സ്വരൂപ ധ്യാനം (ബികെ ഷീബ)', driveUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316176/VISHNU_SWARUP_BY_B.K_SHEEBA.mp3', streamUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316176/VISHNU_SWARUP_BY_B.K_SHEEBA.mp3', downloadUrl: 'https://res.cloudinary.com/tb5bmwd5/video/upload/fl_attachment/v1787316176/VISHNU_SWARUP_BY_B.K_SHEEBA.mp3', folderPath: 'BABA Songs/COMMENTRIES/', filename: 'VISHNU SWARUP BY B.K SHEEBA.mp3' },
];

export type ContactCategory =
  | 'kozhikode-main'
  | 'wayanad-main'
  | 'kozhikode-branches'
  | 'wayanad-branches'
  | 'other-districts';

export type ContactEntry = {
  id: string;
  centreName: string;
  personName: string;
  phone: string;
  secondaryPhone?: string;
  address?: string;
  category: ContactCategory;
};

export const DEFAULT_CONTACTS: ContactEntry[] = [
  // ── KOZHIKODE DISTRICT ──
  {
    id: 'kzh-main',
    centreName: 'ലൈറ്റ് പാലസ് (Kozhikode Main Centre)',
    personName: 'ലൈറ്റ് പാലസ്',
    phone: '9539933699',
    secondaryPhone: '9746334202',
    address: 'ലൈറ്റ് പാലസ്, അശോകപുരം, എരഞ്ഞിപ്പാലം, കോഴിക്കോട് - 673006',
    category: 'kozhikode-main',
  },
  {
    id: 'kzh-b1',
    centreName: 'ശിവലയനം, വെസ്റ്റ് ഹിൽ',
    personName: 'വെസ്റ്റ് ഹിൽ',
    phone: '9895777017',
    address: 'വലക്കെട്ട് നിലം റോഡ്, വെസ്റ്റ് ഹിൽ',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b2',
    centreName: 'സുഖധാമം, ബാലുശ്ശേരി',
    personName: 'ബാലുശ്ശേരി',
    phone: '9562244614',
    address: 'കൈരളി റോഡ്, ബാലുശ്ശേരി',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b3',
    centreName: 'കൊയിലാണ്ടി ബ്രാഞ്ച്',
    personName: 'കൊയിലാണ്ടി',
    phone: '9895770233',
    address: 'ടോൾ ബൂത്തിന് സമീപം, പന്തൽക്കാട്, കൊയിലാണ്ടി',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b4',
    centreName: 'മാവൂർ ബ്രാഞ്ച്',
    personName: 'മാവൂർ',
    phone: '9447951756',
    address: 'മാവൂർ',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b5',
    centreName: 'താമരശ്ശേരി ബ്രാഞ്ച്',
    personName: 'താമരശ്ശേരി',
    phone: '9895516762',
    address: 'പുതിയ സ്റ്റാൻഡിനു സമീപം, കാരാടി, താമരശ്ശേരി',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b6',
    centreName: 'കുന്ദമംഗലം ബ്രാഞ്ച്',
    personName: 'കുന്ദമംഗലം',
    phone: '9447162337',
    address: 'പെരിങ്ങൊളം റോഡ്, കുന്ദമംഗലം',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b7',
    centreName: 'ശിവദം, ചെട്ടിക്കുളം',
    personName: 'ചെട്ടിക്കുളം',
    phone: '9496442892',
    address: 'കൊരമ്പയിൽ റോഡ്, ചെട്ടിക്കുളം',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b8',
    centreName: 'വെള്ളിപ്പറമ്പ് ബ്രാഞ്ച്',
    personName: 'വെള്ളിപ്പറമ്പ്',
    phone: '9020687688',
    address: 'വെള്ളിപ്പറമ്പ്',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b9',
    centreName: 'പന്തീരംകാവ്  ബ്രാഞ്ച്',
    personName: 'പന്തീരംകാവ്',
    phone: '7907850879',
    address: 'പന്തീരംകാവ്',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b10',
    centreName: 'മുക്കം ബ്രാഞ്ച്',
    personName: 'മുക്കം',
    phone: '9447951756',
    address: 'മുക്കം',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b11',
    centreName: 'എലത്തൂർ ബ്രാഞ്ച്',
    personName: 'എലത്തൂർ',
    phone: '7034663819',
    address: 'എലത്തൂർ, കോഴിക്കോട്',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b12',
    centreName: 'പേരാമ്പ്ര ബ്രാഞ്ച്',
    personName: 'പേരാമ്പ്ര',
    phone: '9447655390',
    address: 'ബാദുഷ മാളിന് സമീപം, പേരാമ്പ്ര',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b13',
    centreName: 'ഉള്ള്യേരി ബ്രാഞ്ച്',
    personName: 'ഉള്ള്യേരി',
    phone: '7510762307',
    address: 'ഉള്ള്യേരി, കോഴിക്കോട്',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b14',
    centreName: 'അത്തോളി ബ്രാഞ്ച്',
    personName: 'അത്തോളി',
    phone: '9497211104',
    address: 'അത്തോളി',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b15',
    centreName: 'കുറ്റ്യാടി ബ്രാഞ്ച്',
    personName: 'കുറ്റ്യാടി',
    phone: '9947184937',
    address: 'തളീക്കര, കുറ്റ്യാടി',
    category: 'kozhikode-branches',
  },
  {
    id: 'kzh-b16',
    centreName: 'കൊടക്കാട്ട് താഴം ബ്രാഞ്ച്',
    personName: 'കൊടക്കാട്ട് താഴം',
    phone: '9037798278',
    address: 'കൊടക്കാട്ട് താഴം',
    category: 'kozhikode-branches',
  },

  // ── WAYANAD DISTRICT ──
  {
    id: 'wyn-main',
    centreName: 'ഓം നിവാസ് (Wayanad Main Centre)',
    personName: 'ഓം നിവാസ്',
    phone: '9995586665',
    address: 'ഓം നിവാസ്, ബ്ലോക്ക് പഞ്ചായത്ത് ഓഫീസിനു സമീപം, കൽപ്പറ്റ - 673121',
    category: 'wayanad-main',
  },
  {
    id: 'wyn-b1',
    centreName: 'സുൽത്താൻ ബത്തേരി ബ്രാഞ്ച്',
    personName: 'സുൽത്താൻ ബത്തേരി',
    phone: '+919605260965',
    address: 'സുൽത്താൻ ബത്തേരി',
    category: 'wayanad-branches',
  },
];

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, { label: string; subLabel: string }> = {
  'kozhikode-main': { label: 'Kozhikode Main Centre', subLabel: 'കോഴിക്കോട് പ്രധാന കേന്ദ്രം' },
  'wayanad-main': { label: 'Wayanad Main Centre', subLabel: 'വയനാട് പ്രധാന കേന്ദ്രം' },
  'kozhikode-branches': { label: 'Kozhikode Branches', subLabel: 'കോഴിക്കോട് ശാഖകൾ' },
  'wayanad-branches': { label: 'Wayanad Branches', subLabel: 'വയനാട് ശാഖകൾ' },
  'other-districts': { label: 'B.K District HeadQuarters Kerala', subLabel: 'ജില്ലാ ആസ്ഥാന കേന്ദ്രങ്ങൾ' },
};

export const KERALA_DISTRICT_HQ_DATA = [
  { district: 'Trivandrum', phones: ['0471-2743299', '9895576576'] },
  { district: 'Kollam', phones: ['0474-2761815', '9895837479'] },
  { district: 'Pathanamthitta', phones: ['0473-4224676', '9495435578'] },
  { district: 'Alappuzha', phones: ['9895041993', '9995868033'] },
  { district: 'Kottayam', phones: ['9746470002', '8921689280'] },
  { district: 'Idukki', phones: ['9249867891', '7593947813'] },
  { district: 'Kochi', phones: ['0484-2346950', '8281590864'] },
  { district: 'Thrissur', phones: ['0487-2422345', '9388350847'] },
  { district: 'Palakkad', phones: ['0491-2578525', '9446820448'] },
  { district: 'Malappuram', phones: ['0494-2499939', '8281602918'] },
  { district: 'Kozhikode', phones: ['0495-2770568', '9746334202'] },
  { district: 'Wayanad', phones: ['0493-6206179', '9995586665'] },
  { district: 'Kannur', phones: ['0497-2712456', '9995009519'] },
  { district: 'Kasargode', phones: ['0499-4222901', '7975134264'] },
];

export type YouTubeChannel = {
  id: string;
  label: string;
  url: string;
  logo?: string;
};

export type SocialLinks = {
  youtubeChannels: YouTubeChannel[];
  instagram: string;
  facebook: string;
  whatsapp: string;
  telegram: string;
};

export const PRESET_YOUTUBE_CHANNELS: YouTubeChannel[] = [
  { id: 'bk-sheeba', label: 'BK Sheeba', url: 'https://youtube.com/@bksheeba', logo: '/images/channel-logos/BK_sheeba_logo.png' },
  { id: 'bk-sheeja', label: 'BK Sheeja', url: 'https://youtube.com/@bksheeja', logo: '/images/channel-logos/BK_Sheeja_real.png' },
  { id: 'bks-calicut', label: 'BKS Calicut', url: 'https://youtube.com/@bkscalicut', logo: '/images/channel-logos/bks_calicut_logo.jpg' },
  { id: 'supreme-light', label: 'Supreme Light Creations', url: 'https://youtube.com/@supremelightcreations', logo: '/images/channel-logos/Supremelight_creation_logo_new.png' },
];

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  youtubeChannels: PRESET_YOUTUBE_CHANNELS.map((c) => ({ ...c })),
  instagram: 'https://instagram.com/connectgod',
  facebook: 'https://facebook.com/connectgod',
  whatsapp: 'https://wa.me/910000000000',
  telegram: 'https://t.me/connectgod',
};

export type MurliConfig = {
  pdfUrl: string;
  audioUrl: string;
};

export type AutomationConfig = {
  autoYouTubeEnabled: boolean;
  autoVaradanEnabled: boolean;
  murliChannelId: string;
  podcastChannelId: string;
  liveChannelId: string;
  murliSourceUrl: string;
};

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  autoYouTubeEnabled: false,
  autoVaradanEnabled: false,
  murliChannelId: '',
  podcastChannelId: '',
  liveChannelId: '',
  murliSourceUrl: '',
};

export const DEFAULT_MURLI_CONFIG: MurliConfig = {
  pdfUrl: 'https://drive.google.com/file/d/murli-pdf-example/view',
  audioUrl: 'https://drive.google.com/file/d/murli-audio-example/view',
};

export type Varadan = {
  text: string;
  textMl: string;
  audioUrl: string;
};

export const DEFAULT_VARADAN: Varadan = {
  text: 'May you be constantly content and become a master bestower, full of all divine treasures, giving peace and power to all souls.',
  textMl: 'സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.',
  audioUrl: '',
};

export type Swaman = {
  textMl: string;
  textEn: string;
};

export const DEFAULT_SWAMAN: Swaman = {
  textMl: 'ഞാൻ സദാ സർവ്വ ഗുണ സമ്പന്നനായ ശാന്തസ്വരൂപ ആത്മാവാണ്',
  textEn: 'I am always a peaceful soul full of all divine virtues',
};

export type Announcement = {
  enabled: boolean;
  title: string;
  body: string;
};

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  title: '',
  body: '',
};

export const DRAWER_LINKS = [
  { id: 'about', label: 'About Us', icon: 'Info', url: 'https://brahmakumaris.com' },
] as const;

export const ALERT_BANNER = {
  title: 'Live Murali Class Starting Soon',
  body: 'Today\'s live session begins at 5:45 AM. Tap to join the Zoom meeting.',
  cta: 'Join Now',
};

export const DEFAULT_FULL_MURLI_ML = `ഓം ശാന്തി ബാപ്ദാദാ മധുബൻ

മധുരമായ കുട്ടികളെ, നിങ്ങൾ ഈ അവസാന ജന്മത്തിൽ പവിത്രരായി മാറണം, ബാബയുടെ ശ്രീമതം അനുസരിച്ച് നടക്കണം.

സാരം (Essence):
സത്യമായ അച്ഛനെ തിരിച്ചറിഞ്ഞ് അദ്ദേഹത്തിൽ നിന്ന് ആസ്തി കരസ്ഥമാക്കുക.

വരദാനം (Blessing):
സർവ്വ ഖജനാവുകളാലും സമ്പന്നമായി, മാസ്റ്റർ ദാതാവായി മാറി സർവ്വ ആത്മാക്കൾക്കും ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന സദാ തൃപ്ത ആത്മാവായി ഭവിക്കട്ടെ.

വിശദീകരണം:
ഏതൊരു കുട്ടിയാണോ ബാബയുടെ സർവ്വ ഖജനാവുകളാലും സ്വയം സമ്പൂർണ്ണനാകുന്നത്, അവർ ഓരോ നിമിഷവും ദാതാവായി മാറി ശാന്തി, സ്നേഹം, ആനന്ദം എന്നിവ എല്ലാവർക്കും നൽകുന്നു.

സ്ലോഗൻ (Slogan):
സ്വയം പരിവർത്തനത്തിലൂടെ ലോക പരിവർത്തനം ചെയ്യുക എന്നതാണ് ഏറ്റവും വലിയ സേവനം.`;

export const DEFAULT_FULL_MURLI_EN = `Om Shanti BapDada Madhuban

Sweet children, you have to become pure in this last birth, and follow the elevated directions (shrimat) of the Supreme Father.

Essence:
Recognize the true Father and claim your divine inheritance of peace, purity and power.

Blessing:
May you be constantly content and become a master bestower, full of all divine treasures, giving peace and power to all souls.

Explanation:
Those children who fill themselves with all divine treasures of Baba naturally become bestowers in every step, radiating peace, love and joy to all souls.

Slogan:
To transform the self and thereby transform the world is the highest spiritual service.`;

export const MURLI_TODAY = {
  date: new Date().toISOString().split('T')[0],
  title: 'Daily Murli',
  titleMl: 'ദൈനംദിന മുരളി',
  pdfUrl: DEFAULT_MURLI_CONFIG.pdfUrl,
  audioUrl: DEFAULT_MURLI_CONFIG.audioUrl,
  fullTextMl: DEFAULT_FULL_MURLI_ML,
  fullTextEn: DEFAULT_FULL_MURLI_EN,
};

// ── Storage keys ──────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  meditation: 'connectgod_meditation_items',
  contacts: 'connectgod_contacts',
  varadan: 'connectgod_varadan',
  swaman: 'connectgod_swaman',
  announcement: 'connectgod_announcement',
  checklistEntries: 'connectgod_checklist_entries',
  customTasks: 'connectgod_custom_tasks',
  adminPassword: 'connectgod_admin_password',
  adminSession: 'connectgod_admin_session',
  socialLinks: 'connectgod_social_links',
  murliConfig: 'connectgod_murli_config',
  zoomConfig: 'connectgod_zoom_config',
  hourlyChimes: 'connectgod_hourly_chimes',
  alarms: 'connectgod_alarms',
  murliText: 'connectgod_murli_text',
  trafficDriveFolder: 'connectgod_traffic_drive_folder',
  trafficTracks: 'connectgod_traffic_tracks',
  trafficCacheStatus: 'connectgod_traffic_cache_status',
  automation: 'connectgod_automation_config',
} as const;

// ── Google Drive URL helpers ──────────────────────────────────────────

export function driveToStreamingUrl(driveUrl: string): string {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) return driveUrl;
  return `https://drive.google.com/uc?export=open&id=${fileId}`;
}

export function driveToFallbackStreamingUrl(driveUrl: string): string {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) return driveUrl;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function driveToDownloadUrl(driveUrl: string): string {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) return driveUrl;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /googleusercontent\.com\/d\/([a-zA-Z0-9-_]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

