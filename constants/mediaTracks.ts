export interface MediaTrack {
  id: string;
  title: string;
  url: string;
  category: 'song' | 'commentary' | 'music' | 'ringtone';
  subCategory?: string;
  speaker?: string;
  duration?: number;
}

// ── Commentary Sub-tracks: Sheeba Sister ───────────────────────────────
export const SHEEBA_SISTER_COMMENTARIES: MediaTrack[] = [
  { id: 'sh1', title: 'Adisakthi Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/ADISAKTHI_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh2', title: 'Bhagyasali Atma', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316100/BHAGYASALI_ATMA_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh3', title: 'Pancha Thathwa Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh4', title: 'Jwalamukhi Yog', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316132/JWALAMUKHI_YOG_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh5', title: 'Pavithra Swaroopam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316056/PAVITHRA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh6', title: 'Vishnu Swarup', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316176/VISHNU_SWARUP_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh7', title: 'Vighna Vinasaka Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316173/VIGHNA_VINASAKA_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh8', title: 'Sneha Swaroopam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/SNEHA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
];

// ── Commentary Sub-tracks: Sheeja Sister ───────────────────────────────
export const SHEEJA_SISTER_COMMENTARIES: MediaTrack[] = [
  { id: 'sj1', title: 'Atma Darshan Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj2', title: 'Paramdham Yatra Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj3', title: 'Murli Chintan Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj4', title: 'Karmayogi Sthiti Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj5', title: 'Avyakt Milan Chintan', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj6', title: 'Bindu Swaroop Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
];

// ── Commentary Sub-tracks: Others ─────────────────────────────────────
export const OTHERS_COMMENTARIES: MediaTrack[] = [
  { id: 'co1', title: 'First Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316060/01_1st_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co2', title: 'Second Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co3', title: 'Third Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co4', title: 'Fourth Day Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co5', title: 'Char Dham Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co6', title: 'Durga Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787317291/DURGA_YOGA_NEW.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co7', title: 'Lakshmi Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316089/LAKSHMI_YOGA.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co8', title: 'Chakra Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316097/CHAKRA_YOGA_NEW.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co9', title: 'Chakra Yoga Stage 2', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316126/CHAKRA_YOGA.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co10', title: 'Jwalamukhi Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI_NEW.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co11', title: 'Jwalamukhi Tapasya', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Jwalamukhi.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co12', title: 'Lakshmi Yoga Short', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Lakshmi_Yoga_Short.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co13', title: 'Panchaswaroop Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', category: 'commentary', subCategory: 'others' },
];

export const MASTER_COMMENTARY_TRACKS: MediaTrack[] = [
  ...SHEEBA_SISTER_COMMENTARIES,
  ...SHEEJA_SISTER_COMMENTARIES,
  ...OTHERS_COMMENTARIES,
];

// ── Songs Sub-tracks: Om and Bhorg ────────────────────────────────────
export const OM_AND_BHORG_TRACKS: MediaTrack[] = [
  { id: 'om1', title: 'Om Dhwani - Meenu Purushottum', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/Omdhvani_meenu_Purushottum.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om2', title: 'Om Dhwani - Mahendra Kapoor', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/Omdhvani_mahendra_Kappor.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om3', title: 'Om Dhwani Divine Vibrations', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Nirwan.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om4', title: 'Omkar Silence Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om5', title: 'Deep Om Chanting Dhun', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'bh1', title: 'Bhog Sandesh Divine Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'bh2', title: 'Brahma Bhojan Bhorg Song', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_Moving_On.mp3', category: 'song', subCategory: 'om_and_bhorg' },
];
export const OM_DHWANI_TRACKS = OM_AND_BHORG_TRACKS;

// ── Songs Sub-tracks: Own Tunes ───────────────────────────────────────
export const OWN_TUNES_TRACKS: MediaTrack[] = [
  { id: 'ot1', title: 'Supreme Light Theme Tune', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/04-Maanava-hridaya.mp3', category: 'song', subCategory: 'own_tunes' },
  { id: 'ot2', title: 'Baba Milan Devotional Melody', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/07-baba-en-nathane_1.mp3', category: 'song', subCategory: 'own_tunes' },
  { id: 'ot3', title: 'Paramdham Divine Flute Tune', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'song', subCategory: 'own_tunes' },
  { id: 'ot4', title: 'Amritvela Awakening Melody', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'song', subCategory: 'own_tunes' },
  { id: 'ot5', title: 'Shanti Ki Kiran Spiritual Tune', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_Moving_On.mp3', category: 'song', subCategory: 'own_tunes' },
  { id: 'ot6', title: 'Kozhikode Center Special Tune', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Letting_Go.mp3', category: 'song', subCategory: 'own_tunes' },
];

// ── Music Sub-tracks: Function Music ───────────────────────────────────
export const FUNCTION_MUSIC_TRACKS: MediaTrack[] = [
  { id: 'fn_m1', title: 'Welcome Ceremony Instrumental', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Playful_Work.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m2', title: 'Candle Lighting Theme Music', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m3', title: 'Felicitation & Honor Fanfare', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m4', title: 'Stage Inauguration Melody', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m5', title: 'Blessings & Greetings Tune', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_Moving_On.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m6', title: 'Celebration Finale Symphony', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Angel_Meditation_Instrumental_Music_Brahma_Kumaris_Raja_Yoga_Peace.mp3', category: 'music', subCategory: 'function_music' },
];

// ── Music Sub-tracks: Own Music ───────────────────────────────────────
export const OWN_MUSIC_TRACKS: MediaTrack[] = [
  { id: 'om_m1', title: 'Deep Serenity Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m2', title: 'Golden Age Ambient Sitar', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m3', title: 'Cosmic Silence Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m4', title: 'Angelic Radiance Piano', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Angel_Meditation_Instrumental_Music_Brahma_Kumaris_Raja_Yoga_Peace.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m5', title: 'Shanti Sthiti Harmony', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m6', title: 'Soul Consciousness Symphony', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'music', subCategory: 'own_music' },
];

// ── Ringtones Sub-tracks: Hindi Ringtones ─────────────────────────────
export const HINDI_RINGTONES: MediaTrack[] = [
  { id: 'rt_h1', title: 'Wah Baba Wah Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'ringtone', subCategory: 'hindi' },
  { id: 'rt_h2', title: 'Mere Baba Dhun Ringtone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_Moving_On.mp3', category: 'ringtone', subCategory: 'hindi' },
  { id: 'rt_h3', title: 'Shiv Shaktimaan Tone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'ringtone', subCategory: 'hindi' },
  { id: 'rt_h4', title: 'Shanti Dham Ringtone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Letting_Go.mp3', category: 'ringtone', subCategory: 'hindi' },
  { id: 'rt_h5', title: 'Om Shanti Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'ringtone', subCategory: 'hindi' },
  { id: 'rt_h6', title: 'Brahma Baba Yaad Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'ringtone', subCategory: 'hindi' },
];

// ── Ringtones Sub-tracks: Malayalam Ringtones ─────────────────────────
export const MALAYALAM_RINGTONES: MediaTrack[] = [
  { id: 'rt_m1', title: 'Traffic Control Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m2', title: 'Temple Bell Ringtone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m3', title: 'Amritvela Morning Bell', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m4', title: 'Shantidham Malayalam Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m5', title: 'Paramdham Divine Tone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Nirwan.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m6', title: 'Hourly Reminder Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Playful_Work.mp3', category: 'ringtone', subCategory: 'malayalam' },
];

export const SONGS_DATA: MediaTrack[] = [];
export const MUSIC_DATA: MediaTrack[] = [];

export const MASTER_MEDIA_DATA: MediaTrack[] = [
  ...MASTER_COMMENTARY_TRACKS,
  ...OM_DHWANI_TRACKS,
  ...OWN_TUNES_TRACKS,
  ...FUNCTION_MUSIC_TRACKS,
  ...OWN_MUSIC_TRACKS,
  ...HINDI_RINGTONES,
  ...MALAYALAM_RINGTONES,
];

export const COMMENTARY_TRACKS = MASTER_COMMENTARY_TRACKS;
export const INITIAL_TRACKS = MASTER_MEDIA_DATA;
