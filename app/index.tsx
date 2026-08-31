import React, { useEffect, useState } from 'react';
import { Animated, Easing, Linking, StyleSheet, View } from 'react-native';
import { Header } from '@/components/Header';
import { SideDrawer } from '@/components/SideDrawer';
import { TabBar, TabKey } from '@/components/TabBar';
import { AdminPanel } from '@/components/AdminPanel';
import { ChannelSubPageModal } from '@/components/ChannelSubPageModal';
import { HomeScreen } from './screens/HomeScreen';
import { MurliScreen } from './screens/MurliScreen';
import { DailyChartScreen } from './screens/DailyChartScreen';
import { TrafficControlScreen } from './screens/TrafficControlScreen';
import { MediaScreen } from './screens/MediaScreen';
import { ContactScreen } from './screens/ContactScreen';
import { COLORS } from '@/lib/theme';
import {
  DEFAULT_MEDITATION_ITEMS,
  DEFAULT_CONTACTS,
  DEFAULT_VARADAN,
  DEFAULT_SWAMAN,
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_SOCIAL_LINKS,
  DEFAULT_MURLI_CONFIG,
  DEFAULT_ZOOM_CONFIG,
  STORAGE_KEYS,
  CHANNELS,
  MeditationItem,
  ContactEntry,
  Varadan,
  Swaman,
  Announcement,
  SocialLinks,
  MurliConfig,
  ZoomConfig,
  Channel,
} from '@/lib/constants';
import { getJSON, getDateStampedJSON, purgeStaleStorageKeys } from '@/lib/storage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchAutoContent, getCachedAutoContent, AutoContentResult } from '@/lib/auto-content';
import { fetchDailyMurli, getCachedDailyMurli, getInitialDailyMurli, getTodayISTDateString } from '@/services/murliService';
import { getDailyVaradanamAndSwaman } from '@/services/varadanamDataset';
import { fetchDailySwaman, getCachedDailySwaman, getSwamanByDate } from '@/services/swamanService';
import { clearYouTubeCache } from '@/services/youtube';
import { fetchDriveAudioPlaylist, driveTracksToMeditationItems } from '@/services/mediaService';
import { initNotificationService } from '@/services/notificationService';
import { downloadAndCacheAllTrafficTracks } from '@/services/trafficAudioService';

type AdminData = {
  meditationItems: MeditationItem[];
  contacts: ContactEntry[];
  varadan: Varadan;
  swaman?: Swaman;
  announcement: Announcement;
  socialLinks: SocialLinks;
  murliConfig: MurliConfig;
  zoomConfig?: ZoomConfig;
};

export default function App() {
  const [tab, setTab] = useState<TabKey>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const initialMurli = getInitialDailyMurli();
  const initialSwaman = getSwamanByDate();
  const todayBlessing = getDailyVaradanamAndSwaman();

  const [meditationItems, setMeditationItems] = useState<MeditationItem[]>(DEFAULT_MEDITATION_ITEMS);
  const [contacts, setContacts] = useState<ContactEntry[]>(DEFAULT_CONTACTS);
  const [varadan, setVaradan] = useState<Varadan>(() => {
    const today = getTodayISTDateString();
    const saved = getDateStampedJSON<Varadan | null>(STORAGE_KEYS.varadan, today, null);
    if (saved && saved.textMl && saved.textMl !== DEFAULT_VARADAN.textMl) return saved;
    return {
      textMl: todayBlessing.varadanText || initialMurli.varadanSnippetMl,
      text: initialMurli.varadanSnippetEn,
      audioUrl: initialMurli.audioUrl,
    };
  });
  const [swaman, setSwaman] = useState<Swaman>(() => {
    const cached = getCachedDailySwaman();
    if (cached && cached.textMl) return cached;
    const saved = getJSON<Swaman | null>(STORAGE_KEYS.swaman, null);
    if (saved && saved.textMl) return saved;
    return initialSwaman;
  });
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [murliConfig, setMurliConfig] = useState<MurliConfig>(DEFAULT_MURLI_CONFIG);
  const [zoomConfig, setZoomConfig] = useState<ZoomConfig>(DEFAULT_ZOOM_CONFIG);
  const [autoContent, setAutoContent] = useState<AutoContentResult | null>(getCachedAutoContent());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      clearYouTubeCache();
      const murliData = await fetchDailyMurli(undefined, true);
      if (murliData && murliData.varadanSnippetMl) {
        setVaradan({
          textMl: murliData.varadanSnippetMl,
          text: murliData.varadanSnippetEn,
          audioUrl: murliData.audioUrl,
        });
      }
      const [swamanRes, autoRes] = await Promise.allSettled([
        fetchDailySwaman(murliData?.date, murliData?.fullTextMl),
        fetchAutoContent(true),
      ]);
      if (swamanRes.status === 'fulfilled' && swamanRes.value?.textMl) {
        setSwaman(swamanRes.value);
      }
      if (autoRes.status === 'fulfilled' && autoRes.value) {
        setAutoContent(autoRes.value);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Load persisted dynamic content on mount ──
  useEffect(() => {
    const today = getTodayISTDateString();
    purgeStaleStorageKeys(today);

    setMeditationItems(getJSON(STORAGE_KEYS.meditation, DEFAULT_MEDITATION_ITEMS));
    setContacts(getJSON(STORAGE_KEYS.contacts, DEFAULT_CONTACTS));
    
    const savedVaradan = getDateStampedJSON<Varadan | null>(STORAGE_KEYS.varadan, today, null);
    if (savedVaradan && savedVaradan.textMl) {
      setVaradan(savedVaradan);
    }
    
    setAnnouncement(getJSON(STORAGE_KEYS.announcement, DEFAULT_ANNOUNCEMENT));
    setSocialLinks(getJSON(STORAGE_KEYS.socialLinks, DEFAULT_SOCIAL_LINKS));
    setMurliConfig(getJSON(STORAGE_KEYS.murliConfig, DEFAULT_MURLI_CONFIG));
    setZoomConfig(getJSON(STORAGE_KEYS.zoomConfig, DEFAULT_ZOOM_CONFIG));

    // Clear stale YouTube cache on initial startup
    clearYouTubeCache();

    // Fetch daily Swaman
    fetchDailySwaman()
      .then((res) => {
        if (res && res.textMl) setSwaman(res);
      })
      .catch(() => {});

    // Fetch daily Murli & Varadan extraction
    fetchDailyMurli()
      .then((data) => {
        if (data && data.varadanSnippetMl) {
          setVaradan({
            textMl: data.varadanSnippetMl,
            text: data.varadanSnippetEn,
            audioUrl: data.audioUrl,
          });
        }
        if (data && data.fullTextMl) {
          fetchDailySwaman(data.date, data.fullTextMl)
            .then((res) => {
              if (res && res.textMl) setSwaman(res);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Synchronize Google Drive audio commentaries playlist
    fetchDriveAudioPlaylist()
      .then((tracks) => {
        if (tracks && tracks.length > 0) {
          setMeditationItems(driveTracksToMeditationItems(tracks));
        }
      })
      .catch(() => {});

    // Force immediate live YouTube media fetch bypassing cache
    fetchAutoContent(true)
      .then((result) => {
        setAutoContent(result);
      })
      .catch((err) => {
        console.warn('[App] Auto content fetch error:', err);
      });

    // Initialize background notifications & alarms
    initNotificationService().catch(() => {});

    // Automatically check and cache Traffic Control MP3s for 100% offline playback
    downloadAndCacheAllTrafficTracks().catch(() => {});
  }, []);

  // When auto content arrives, update varadan if auto-extracted
  const effectiveVaradan: Varadan =
    autoContent?.varadan && autoContent.varadan.textMl ? autoContent.varadan : varadan;

  const fade = useState(new Animated.Value(1))[0];
  const slideY = useState(new Animated.Value(0))[0];

  const handleTabChange = (key: TabKey) => {
    if (tab === key) return;
    Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setTab(key);
      slideY.setValue(12);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleAdminData = (data: AdminData) => {
    setMeditationItems(data.meditationItems);
    setContacts(data.contacts);
    setVaradan(data.varadan);
    if (data.swaman) setSwaman(data.swaman);
    setAnnouncement(data.announcement);
    setSocialLinks(data.socialLinks);
    setMurliConfig(data.murliConfig);
    if (data.zoomConfig) setZoomConfig(data.zoomConfig);
  };

  const handleSelectChannelById = (channelId: string) => {
    const found = CHANNELS.find((c) => c.id === channelId);
    if (found) setSelectedChannel(found);
  };

  return (
    <View style={styles.container}>
      <Header
        onMenuPress={() => setDrawerOpen(true)}
        onLogoPress={() => handleTabChange('home')}
        onAdminPress={() => setAdminOpen(true)}
      />

      <Animated.View
        style={[
          styles.screenWrap,
          {
            opacity: fade,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <ErrorBoundary onReset={() => handleTabChange('home')}>
          {tab === 'home' && (
            <HomeScreen
              varadan={effectiveVaradan}
              swaman={swaman}
              announcement={announcement}
              onMurliPress={() => handleTabChange('murli')}
              autoContent={autoContent}
              zoomConfig={zoomConfig}
              onRefresh={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}
          {tab === 'murli' && <MurliScreen />}
          {tab === 'traffic' && <TrafficControlScreen />}
          {tab === 'chart' && <DailyChartScreen />}
          {tab === 'media' && <MediaScreen />}
          {tab === 'contact' && <ContactScreen />}
        </ErrorBoundary>
      </Animated.View>

      <TabBar active={tab} onChange={handleTabChange} />

      {/* Side Drawer Menu */}
      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdminPress={() => setAdminOpen(true)}
        onMurliPress={() => handleTabChange('murli')}
        onMeditationPress={() => handleTabChange('media')}
        onSelectChannel={handleSelectChannelById}
        socialLinks={socialLinks}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        visible={adminOpen}
        onClose={() => setAdminOpen(false)}
        onDataChange={handleAdminData}
      />

      {/* Channel Hub Sub-page Modal */}
      <ChannelSubPageModal
        visible={!!selectedChannel}
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.neutral[50],
    overflow: 'hidden',
    position: 'relative',
  },
  screenWrap: {
    flex: 1,
    overflow: 'hidden',
  },
});
