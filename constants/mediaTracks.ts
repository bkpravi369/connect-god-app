export interface MediaTrack {
  id: string;
  title: string;
  url: string;
  category: 'commentary' | 'music' | 'song';
  subCategory?: 'malayalam' | 'hindi';
}

export const MASTER_COMMENTARY_TRACKS: MediaTrack[] = [
  { id: 'c1', title: 'Adisakthi Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/ADISAKTHI_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c2', title: 'Bhagyasali Atma', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316100/BHAGYASALI_ATMA_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c3', title: 'Durga Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787317291/DURGA_YOGA_NEW.mp3', category: 'commentary' },
  { id: 'c4', title: 'Lakshmi Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316089/LAKSHMI_YOGA.mp3', category: 'commentary' },
  { id: 'c5', title: 'Pancha Thathwa Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316051/PANCHA_THATHWA_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c6', title: 'Jwalamukhi Yog', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316132/JWALAMUKHI_YOG_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c7', title: 'Pavithra Swaroopam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316056/PAVITHRA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', category: 'commentary' },
  { id: 'c8', title: 'Chakra Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316097/CHAKRA_YOGA_NEW.mp3', category: 'commentary' },
  { id: 'c9', title: 'Chakra Yoga Stage 2', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316126/CHAKRA_YOGA.mp3', category: 'commentary' },
  { id: 'c10', title: 'Vishnu Swarup', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316176/VISHNU_SWARUP_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c11', title: 'Vighna Vinasaka Yoga', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316173/VIGHNA_VINASAKA_YOGA_BY_B.K_SHEEBA.mp3', category: 'commentary' },
  { id: 'c12', title: 'First Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/v1787316060/01_1st_DAY.mp3', category: 'commentary' },
  { id: 'c13', title: 'Second Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/02_2nd_DAY.mp3', category: 'commentary' },
  { id: 'c14', title: 'Third Day Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/03_3rd_DAY.mp3', category: 'commentary' },
  { id: 'c15', title: 'Fourth Day Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/04_DAY_COMMENTARY.mp3', category: 'commentary' },
  { id: 'c16', title: 'Char Dham Commentary', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Char_dham_commentry.mp3', category: 'commentary' },
  { id: 'c17', title: 'Jwalamukhi Yoga New', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/JWALAMUKHI_NEW.mp3', category: 'commentary' },
  { id: 'c18', title: 'Jwalamukhi Tapasya', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Jwalamukhi.mp3', category: 'commentary' },
  { id: 'c19', title: 'Lakshmi Yoga Short', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/Lakshmi_Yoga_Short.mp3', category: 'commentary' },
  { id: 'c20', title: 'Panchaswaroop Meditation', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/PANCHASWARUPmp3.mp3', category: 'commentary' },
  { id: 'c21', title: 'Sneha Swaroopam', url: 'https://res.cloudinary.com/tb5bmwd5/video/upload/SNEHA_SWAROOPAM_BY_B.K_SHEEBA_SISTER.mp3', category: 'commentary' }
];

// Clean empty arrays for Songs & Music (no dummy fallback tracks)
export const SONGS_DATA: MediaTrack[] = [];
export const MUSIC_DATA: MediaTrack[] = [];

export const MASTER_MEDIA_DATA: MediaTrack[] = [
  ...MASTER_COMMENTARY_TRACKS,
  ...SONGS_DATA,
  ...MUSIC_DATA
];

export const COMMENTARY_TRACKS = MASTER_COMMENTARY_TRACKS;
export const INITIAL_TRACKS = MASTER_MEDIA_DATA;
