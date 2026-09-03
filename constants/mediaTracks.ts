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
  { id: 'sh9', title: '108 Master Almighty Authority', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1788429749/108_Master_Almighty_Authority_Affirmation_for_Success_320kbps.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh10', title: 'Durga Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787317291/DURGA_YOGA_NEW.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh11', title: 'Chakra Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/CHAKRA_YOGA_NEW.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh12', title: 'Chakra Yoga Stage 2', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/CHAKRA_YOGA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh13', title: 'Jwalamukhi Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI_NEW.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh14', title: 'Jwalamukhi Tapasya', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh15', title: 'Lakshmi Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/LAKSHMI_YOGA.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh16', title: 'Lakshmi Yoga Short', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/LAKSHMI_YOGA_SHORT.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh17', title: 'Panchaswaroop Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh18', title: 'Char Dham Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/CHAR_DHAM_COMMENTRY.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh19', title: 'First Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_1st_DAY.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh20', title: 'Second Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh21', title: 'Third Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
  { id: 'sh22', title: 'Fourth Day Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', category: 'commentary', subCategory: 'sheeba_sister', speaker: 'BK Sheeba Sister' },
];

// ── Commentary Sub-tracks: Sheeja Sister ───────────────────────────────
export const SHEEJA_SISTER_COMMENTARIES: MediaTrack[] = [
  { id: 'sj1', title: 'Master Sarva Shaktivan 108 Times', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Master_sarva_shaktivan_108_times_by_BK_Sheeja_sistr.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj2', title: 'Chakra Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Chakra_Yoga_by_BK_Sheeja_Sister.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj3', title: 'Heal Your Self', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Heal_your_Self_by_BK_Sheeja_Sister.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj4', title: 'Karmayogi Sthiti Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
  { id: 'sj5', title: 'Bindu Swaroop Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', category: 'commentary', subCategory: 'sheeja_sister', speaker: 'BK Sheeja Sister' },
];

// ── Commentary Sub-tracks: Others ─────────────────────────────────────
export const OTHERS_COMMENTARIES: MediaTrack[] = [
  { id: 'co1', title: 'Jwalamukhi Meditation Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/jwalamukhi_Meditation_Commentary_Brahma_kumaris_powerful_meditation_bk_pooja.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co2', title: 'Amritvela Meditation - BK Suraj Bhai', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Amritvela_Meditation_-_BK_Suraj_Bhai_Brahma_Kumaris_Awakening_TV.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co3', title: 'Ashariri Sthiti - BK Usha Didi', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Ashariri_Sthiti_Bodiless_Stage_Powerful_Meditation_Commentary_-_BK_Usha_Didi.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co4', title: 'First Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316060/01_1st_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co5', title: 'Second Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co6', title: 'Third Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co7', title: 'Fourth Day Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', category: 'commentary', subCategory: 'others' },
  { id: 'co8', title: 'Char Dham Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', category: 'commentary', subCategory: 'others' },
];

export const MASTER_COMMENTARY_TRACKS: MediaTrack[] = [
  ...SHEEBA_SISTER_COMMENTARIES,
  ...SHEEJA_SISTER_COMMENTARIES,
  ...OTHERS_COMMENTARIES,
];

// ── Songs Sub-tracks: Om and Bhorg ────────────────────────────────────
export const OM_AND_BHORG_TRACKS: MediaTrack[] = [
  { id: 'om1', title: 'Vasudha Ke Es Anchal Me', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Vasudha_ke_es_Anchal_me.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om2', title: 'Teri Yaad Ka Amruth Peethe He', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/TERI_YAAD_KA_AMRUTH_PEETHE_HE.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om3', title: 'Panchi Re Ud Jaa', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06-Panchi_re_ud_jaa.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om4', title: 'Om Dhwani - Meenu Purushottum', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/Omdhvani_meenu_Purushottum.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om5', title: 'Om Dhwani - Mahendra Kapoor', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/Omdhvani_mahendra_Kappor.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om6', title: 'Om Dhwani Divine Vibrations', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Nirwan.mp3', category: 'song', subCategory: 'om_and_bhorg' },
  { id: 'om7', title: 'Omkar Silence Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'song', subCategory: 'om_and_bhorg' },
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

// ── Music Sub-tracks: Meditation Music ─────────────────────────────────
export const MEDITATION_MUSIC_TRACKS: MediaTrack[] = [
  { id: 'mm1', title: 'Flute New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Flute_New.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm2', title: 'Subtle Voice', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm3', title: 'Moving On', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_Moving_On.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm4', title: 'Letting Go', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Letting_Go.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm5', title: 'Rajyoga Meditation Music 1', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm6', title: 'Rajyoga Meditation Music 2', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm7', title: 'Playful Work', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Playful_Work.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm8', title: 'Thoughts', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_Thoughts.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm9', title: 'Silence', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm10', title: 'Awakening', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm11', title: 'Kind Of Music', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Kind_of_Music_58.00.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm12', title: 'Nirwan', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Nirwan.mp3', category: 'music', subCategory: 'meditation_music' },
  { id: 'mm13', title: 'Angel Meditation Instrumental Music', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Angel_Meditation_Instrumental_Music_Brahma_Kumaris_Raja_Yoga_Peace.mp3', category: 'music', subCategory: 'meditation_music' },
];
export const MUSIC_DATA: MediaTrack[] = MEDITATION_MUSIC_TRACKS;

// ── Music Sub-tracks: Function Music ───────────────────────────────────
export const FUNCTION_MUSIC_TRACKS: MediaTrack[] = [
  { id: 'fn_m1', title: 'Flight of Inspiration', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Flight_of_Inspiration.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m2', title: 'Festival of Triumph', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Festival_of_Triumph.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m3', title: 'Rhythm of Victory', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Rhythm_of_Victory.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m4', title: 'Welcome Ceremony Instrumental', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Playful_Work.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m5', title: 'Candle Lighting Theme Music', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'music', subCategory: 'function_music' },
  { id: 'fn_m6', title: 'Felicitation & Honor Fanfare', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'music', subCategory: 'function_music' },
];

// ── Music Sub-tracks: Own Music ───────────────────────────────────────
export const OWN_MUSIC_TRACKS: MediaTrack[] = [
  { id: 'om_m1', title: 'Paramatma - Deepest Stillness', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Paramatma_-_Deepest_Stillness.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m2', title: 'Paramdham Cover', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Paramdham_Cover.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m3', title: 'Paramatma - Prayer of the Soul', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Paramatma_-_Prayer_of_the_Soul.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m4', title: 'Deep Serenity Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m5', title: 'Golden Age Ambient Sitar', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01-Rajyoga_Meditation_Music-1.mp3', category: 'music', subCategory: 'own_music' },
  { id: 'om_m6', title: 'Cosmic Silence Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'music', subCategory: 'own_music' },
];

// ── Songs Fallbacks: Hindi & Malayalam ─────────────────────────────────
export const HINDI_SONGS_FALLBACK: MediaTrack[] = [
  { id: 'h_s1', title: 'Pyare Brahma Baba', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Pyare_Brahma_Baba.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s2', title: 'Kush Ho Ke Gaarahe Hai', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Kush_Ho_Ke_Gaarahe_Hai.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s3', title: 'Aaj Bhi Deto Ho Baba', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Aaj_Bhi_Deto_Ho_Baba.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s4', title: 'Mere Baba Tumhare Yaad', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Mere_Baba_Tumhare_Yaad.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s5', title: 'Amrutvela Ho Gayi - Gyan Surya', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Amrutvela_Ho_Gayi-Gyan_Surya.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s6', title: 'Yogi Pavitra Jeevan', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Yogi_Pavitra_Jeevan.mp3', category: 'song', subCategory: 'hindi' },
  { id: 'h_s7', title: 'O Praan Dhan', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/O_Praan_dhan.mp3', category: 'song', subCategory: 'hindi' },
];

export const MALAYALAM_SONGS_FALLBACK: MediaTrack[] = [
  { id: 'm_s1', title: 'Maanava Hridaya', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/04-Maanava-hridaya.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s2', title: 'Baba En Nathane', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787367169/07-baba-en-nathane_1.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s3', title: 'Paramajyotiyam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06-paramajyotiyam.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s4', title: 'Kanivin Kadal', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-kanivin.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s5', title: 'Kaliyuga Nadam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/010-kaliyuga-1.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s6', title: 'Athmavinaaraanu', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/05-athmavinaaraanu.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s7', title: 'Njanenna Sathyathe', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03-Njanenna-sathyathe.mp3', category: 'song', subCategory: 'malayalam' },
  { id: 'm_s8', title: 'Eeshwaranoru Naal', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/08-eeshwaranoru-naal_1.mp3', category: 'song', subCategory: 'malayalam' },
];

export const SONGS_DATA: MediaTrack[] = [...HINDI_SONGS_FALLBACK, ...MALAYALAM_SONGS_FALLBACK];

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
  { id: 'rt_m0', title: 'Allahu Yahova Cover', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Allahu_yahova_cover_1.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m1', title: 'Traffic Control Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Subtle_Voice.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m2', title: 'Temple Bell Ringtone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02-Rajyoga_Meditation_Music-2.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m3', title: 'Amritvela Morning Bell', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Awakning.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m4', title: 'Shantidham Malayalam Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/06_Silence.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m5', title: 'Paramdham Divine Tone', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/01_Nirwan.mp3', category: 'ringtone', subCategory: 'malayalam' },
  { id: 'rt_m6', title: 'Hourly Reminder Chime', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_Playful_Work.mp3', category: 'ringtone', subCategory: 'malayalam' },
];

export const MASTER_MEDIA_DATA: MediaTrack[] = [
  ...MASTER_COMMENTARY_TRACKS,
  ...OM_AND_BHORG_TRACKS,
  ...OWN_TUNES_TRACKS,
  ...FUNCTION_MUSIC_TRACKS,
  ...OWN_MUSIC_TRACKS,
  ...HINDI_SONGS_FALLBACK,
  ...MALAYALAM_SONGS_FALLBACK,
  ...MEDITATION_MUSIC_TRACKS,
  ...HINDI_RINGTONES,
  ...MALAYALAM_RINGTONES,
];

export const COMMENTARY_TRACKS = MASTER_COMMENTARY_TRACKS;
export const INITIAL_TRACKS = MASTER_MEDIA_DATA;
