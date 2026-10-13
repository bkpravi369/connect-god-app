import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Capacitor } from '@capacitor/core';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Globe,
  Music,
  Play,
  Pause,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  ArrowLeft,
  LogOut,
  Folder,
  Check,
  FileAudio,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Share2,
  Youtube,
  Eye,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import { useToast } from '@/components/ToastProvider';
import { CloudflareR2Item, WORKER_BASE_URL } from '@/services/audioService';
import {
  STORAGE_KEYS,
  DEFAULT_WEBSITE_URL,
  DEFAULT_SOCIAL_LINKS,
  SocialLinks,
  YouTubeChannel,
  ZOOM_CONFIG,
} from '@/lib/constants';
import { getJSON, setJSON, getDateStampedJSON, setDateStampedJSON } from '@/lib/storage';
import { getTodayISTDateString } from '@/services/murliService';
import {
  fetchDailyVardanFromMurli,
  extractVardanFromHtml,
  isMalayalamText,
  isGenericVaradan,
} from '@/services/vardanService';

const ADMIN_PIN = '108108';

type AdminTab = 'varadanam' | 'links' | 'media';

interface FolderOption {
  id: string;
  folder: string;
  label: string;
  group: 'Commentary' | 'Songs' | 'Music' | 'Ringtones' | 'Karaoke' | 'Occasions';
  tag: string;
}

const R2_FOLDERS: FolderOption[] = [
  // Commentary
  { id: 'com_sheeba', folder: 'commentary-sheeba sister', label: 'Sheeba Sister', group: 'Commentary', tag: 'commentary_sheeba' },
  { id: 'com_sheeja', folder: 'commentary-sheeja sister', label: 'Sheeja Sister', group: 'Commentary', tag: 'commentary_sheeja' },
  { id: 'com_others', folder: 'commentary-others', label: 'Others', group: 'Commentary', tag: 'commentary_others' },
  // Songs
  { id: 'song_hindi', folder: 'song-hindi', label: 'Hindi Songs', group: 'Songs', tag: 'song_hindi' },
  { id: 'song_malayalam', folder: 'song-malayalam', label: 'Malayalam Songs', group: 'Songs', tag: 'song_malayalam' },
  { id: 'song_om', folder: 'om-bhorg', label: 'Om & Bhog', group: 'Songs', tag: 'om_and_bhog' },
  { id: 'song_own', folder: 'own-tunes', label: 'Own Tune', group: 'Songs', tag: 'own_tunes' },
  // Music
  { id: 'mus_own', folder: 'own-music ', label: 'Own Music', group: 'Music', tag: 'own_music' },
  { id: 'mus_med', folder: 'Meditation-music', label: 'Meditation Music', group: 'Music', tag: 'meditation_music' },
  // Ringtones
  { id: 'ring_hindi', folder: 'ringtoned-hindi', label: 'Hindi Ringtones', group: 'Ringtones', tag: 'ringtone_hindi' },
  { id: 'ring_malayalam', folder: 'ringtones-malayalam', label: 'Malayalam Ringtones', group: 'Ringtones', tag: 'ringtone_malayalam' },
  // Karaoke
  { id: 'kar_malayalam', folder: 'karaoke_malayalam', label: 'Malayalam Karaoke', group: 'Karaoke', tag: 'karaoke_malayalam' },
  { id: 'kar_hindi', folder: 'karaoke_hindi', label: 'Hindi Karaoke', group: 'Karaoke', tag: 'karaoke_hindi' },
  // Occasion Songs
  { id: 'occ_func', folder: 'other_function_music', label: 'Function Music', group: 'Occasions', tag: 'other_function_music' },
  { id: 'occ_bday', folder: 'other_birthday_songs', label: 'Birthday Songs', group: 'Occasions', tag: 'other_birthday_songs' },
  { id: 'occ_ny', folder: 'other_newyear_songs', label: 'New Year Songs', group: 'Occasions', tag: 'other_newyear_songs' },
  { id: 'occ_rakhi', folder: 'other_rakhi_songs', label: 'Rakhi Songs', group: 'Occasions', tag: 'other_rakhi_songs' },
  { id: 'occ_shiv', folder: 'other_shivjayanti_songs', label: 'Shiv Jayanti Songs', group: 'Occasions', tag: 'other_shivjayanti_songs' },
  { id: 'occ_flag', folder: 'other_flaghoisting_songs', label: 'Flag Hoisting Songs', group: 'Occasions', tag: 'other_flaghoisting_songs' },
  { id: 'occ_tc', folder: 'other_trafficcontrol_songs', label: 'Traffic Control Songs', group: 'Occasions', tag: 'other_trafficcontrol_songs' },
  { id: 'occ_murli', folder: 'other_murli_songs', label: 'Murli Songs', group: 'Occasions', tag: 'other_murli_songs' },
  { id: 'occ_panch', folder: 'other_panchaswaroopam', label: 'Panchaswaroopam', group: 'Occasions', tag: 'other_panchaswaroopam' },
];

export default function AdminManageScreen() {
  const router = useRouter();
  const toast = useToast();

  // 1. Google Play Policy Guard: Redirect native app instances immediately
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      router.replace('/');
    }
  }, [router]);

  if (Capacitor.isNativePlatform()) {
    return null;
  }

  // 2. Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // 3. Navigation Tab State
  const [activeTab, setActiveTab] = useState<AdminTab>('varadanam');

  // ── Tab 1 State: Varadanam Hybrid Mode ───────────────────────────────────
  const todayDate = useMemo(() => getTodayISTDateString(), []);
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(false);
  const [manualVaradanText, setManualVaradanText] = useState<string>('');
  const [automatedVaradanText, setAutomatedVaradanText] = useState<string>('');
  const [isAutomatedLoading, setIsAutomatedLoading] = useState<boolean>(false);

  // ── Tab 2 State: External & Social Links ─────────────────────────────────
  const [websiteUrl, setWebsiteUrl] = useState<string>(DEFAULT_WEBSITE_URL);
  const [zoomUrl, setZoomUrl] = useState<string>(ZOOM_CONFIG.joinUrl);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [newChannelLabel, setNewChannelLabel] = useState<string>('');
  const [newChannelUrl, setNewChannelUrl] = useState<string>('');

  // ── Tab 3 State: Cloudflare Media Inventory ──────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState<FolderOption>(R2_FOLDERS[0]);
  const [tracks, setTracks] = useState<CloudflareR2Item[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize data on authentication
  useEffect(() => {
    if (!isAuthenticated) return;

    // Load Varadanam Override state
    const savedOverride = getDateStampedJSON<{ textMl: string; enabled: boolean } | null>(
      STORAGE_KEYS.varadanOverride,
      todayDate,
      null
    );
    if (savedOverride && savedOverride.enabled && savedOverride.textMl) {
      setOverrideEnabled(true);
      setManualVaradanText(savedOverride.textMl);
    } else {
      setOverrideEnabled(false);
      setManualVaradanText('');
    }

    // Load automated regex extraction for comparison
    fetchAutomatedVaradan();

    // Load External Links
    const savedWebsite = getJSON<string>(STORAGE_KEYS.websiteUrl, DEFAULT_WEBSITE_URL);
    setWebsiteUrl(savedWebsite || DEFAULT_WEBSITE_URL);

    const savedSocial = getJSON<SocialLinks>(STORAGE_KEYS.socialLinks, DEFAULT_SOCIAL_LINKS);
    setSocialLinks(savedSocial || DEFAULT_SOCIAL_LINKS);

    const savedZoom = getJSON<{ joinUrl?: string } | null>(STORAGE_KEYS.zoomConfig, null);
    if (savedZoom?.joinUrl) {
      setZoomUrl(savedZoom.joinUrl);
    }

    // Load initial media folder
    loadFolderTracks(selectedFolder.folder);
  }, [isAuthenticated, todayDate]);

  // Load tracks when folder changes
  useEffect(() => {
    if (!isAuthenticated) return;
    loadFolderTracks(selectedFolder.folder);
  }, [selectedFolder, isAuthenticated]);

  const fetchAutomatedVaradan = async () => {
    setIsAutomatedLoading(true);
    try {
      const live = await fetchDailyVardanFromMurli(true);
      setAutomatedVaradanText(live || '');
    } catch (err) {
      console.warn('[Admin] Error fetching automated varadan:', err);
    } finally {
      setIsAutomatedLoading(false);
    }
  };

  const loadFolderTracks = async (folderPath: string) => {
    setLoadingTracks(true);
    try {
      const res = await fetch(`${WORKER_BASE_URL}/?folder=${encodeURIComponent(folderPath)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTracks(data);
      } else {
        setTracks([]);
      }
    } catch (err) {
      console.warn('[Admin] Error fetching folder tracks:', err);
      toast.show('Failed to fetch tracks for folder', 'error');
      setTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handlePinSubmit = () => {
    if (enteredPin.trim() === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError('');
      toast.show('Admin authentication successful', 'success');
    } else {
      setPinError('Invalid PIN code. Please try again.');
      toast.show('Incorrect Admin PIN', 'error');
    }
  };

  const handleLogout = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingUrl(null);
    setIsAuthenticated(false);
    setEnteredPin('');
  };

  // ── Varadanam Actions ──
  const handleSaveVaradanOverride = () => {
    if (overrideEnabled) {
      const cleaned = manualVaradanText.trim();
      if (!cleaned || cleaned.length < 10) {
        toast.show('Please enter a valid blessing sentence', 'error');
        return;
      }
      if (!isMalayalamText(cleaned)) {
        toast.show('Blessing text must be in Malayalam script', 'error');
        return;
      }

      setDateStampedJSON(STORAGE_KEYS.varadanOverride, todayDate, {
        textMl: cleaned,
        enabled: true,
      });

      // Also prime STORAGE_KEYS.varadan so it updates immediately
      setDateStampedJSON(STORAGE_KEYS.varadan, todayDate, {
        textMl: cleaned,
        text: cleaned,
        audioUrl: '',
      });

      toast.show('Manual Varadanam saved! Home screen updated.', 'success');
    } else {
      // Disabled override: clear and fallback to regex
      handleRevertToAutomatedVaradan();
    }
  };

  const handleRevertToAutomatedVaradan = () => {
    setDateStampedJSON(STORAGE_KEYS.varadanOverride, todayDate, null);
    setOverrideEnabled(false);
    setManualVaradanText('');
    toast.show('Reverted to Automated Murli Regex extraction', 'info');
    fetchAutomatedVaradan();
  };

  // ── External Links Actions ──
  const handleSaveLinks = () => {
    setJSON(STORAGE_KEYS.websiteUrl, websiteUrl.trim());
    setJSON(STORAGE_KEYS.socialLinks, socialLinks);
    setJSON(STORAGE_KEYS.zoomConfig, { ...ZOOM_CONFIG, joinUrl: zoomUrl.trim() });
    toast.show('External & Social Links updated successfully!', 'success');
  };

  const handleResetLinksToDefault = () => {
    setWebsiteUrl(DEFAULT_WEBSITE_URL);
    setSocialLinks(DEFAULT_SOCIAL_LINKS);
    setZoomUrl(ZOOM_CONFIG.joinUrl);
    setJSON(STORAGE_KEYS.websiteUrl, DEFAULT_WEBSITE_URL);
    setJSON(STORAGE_KEYS.socialLinks, DEFAULT_SOCIAL_LINKS);
    setJSON(STORAGE_KEYS.zoomConfig, ZOOM_CONFIG);
    toast.show('Reset links to defaults', 'info');
  };

  const handleAddYouTubeChannel = () => {
    if (!newChannelLabel.trim() || !newChannelUrl.trim()) {
      toast.show('Enter channel name and URL', 'error');
      return;
    }
    const newChan: YouTubeChannel = {
      id: `custom-${Date.now()}`,
      label: newChannelLabel.trim(),
      url: newChannelUrl.trim(),
    };
    setSocialLinks((prev) => ({
      ...prev,
      youtubeChannels: [...prev.youtubeChannels, newChan],
    }));
    setNewChannelLabel('');
    setNewChannelUrl('');
    toast.show('Added channel to list. Remember to save changes.', 'info');
  };

  const handleRemoveYouTubeChannel = (id: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      youtubeChannels: prev.youtubeChannels.filter((c) => c.id !== id),
    }));
  };

  // ── Media Inventory Actions ──
  const handleTogglePreview = (url: string) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (playingUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingUrl(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = document.createElement('audio');
      document.body.appendChild(audioRef.current);
    }

    audioRef.current.src = encodeURI(decodeURI(url));
    audioRef.current
      .play()
      .then(() => {
        setPlayingUrl(url);
      })
      .catch((err) => {
        console.warn('[Admin] Audio playback error:', err);
        toast.show('Unable to stream audio track', 'error');
      });

    audioRef.current.onended = () => {
      setPlayingUrl(null);
    };
  };

  const handleCopyUrl = async (track: CloudflareR2Item) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(track.url);
        setCopiedKey(track.key);
        toast.show('Stream URL copied to clipboard', 'success');
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch {
      toast.show('Failed to copy URL', 'error');
    }
  };

  const visibleTracks = useMemo(() => {
    if (!mediaSearchQuery.trim()) return tracks;
    const q = mediaSearchQuery.toLowerCase().trim();
    return tracks.filter((t) => (t.name || t.key || '').toLowerCase().includes(q));
  }, [tracks, mediaSearchQuery]);

  const filteredFolders = useMemo(() => {
    if (selectedGroupFilter === 'All') return R2_FOLDERS;
    return R2_FOLDERS.filter((f) => f.group === selectedGroupFilter);
  }, [selectedGroupFilter]);

  const totalFolderTracks = tracks.length;
  const totalFolderSizeMb = useMemo(() => {
    const bytes = tracks.reduce((sum, t) => sum + (t.size || 0), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [tracks]);

  // ── Render Authentication Screen ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <View style={styles.authIconWrap}>
            <KeyRound color="#8B0000" size={32} strokeWidth={2.2} />
          </View>
          <Text style={styles.authTitle}>Connect GOD Admin Console</Text>
          <Text style={styles.authSubtitle}>
            Desktop Management Portal • Varadanam, External Links & Media Inventory
          </Text>

          <View style={styles.pinInputWrap}>
            <TextInput
              style={styles.pinInput}
              placeholder="Enter 6-digit Admin PIN"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={enteredPin}
              onChangeText={(text) => {
                setEnteredPin(text);
                if (pinError) setPinError('');
              }}
              onSubmitEditing={handlePinSubmit}
            />
          </View>

          {Boolean(pinError) && <Text style={styles.errorText}>{pinError}</Text>}

          <Pressable
            style={({ pressed }) => [styles.authBtn, pressed && styles.btnPressed]}
            onPress={handlePinSubmit}
          >
            <Lock color="#ffffff" size={16} strokeWidth={2.4} />
            <Text style={styles.authBtnText}>Unlock Admin Dashboard</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/')}
          >
            <ArrowLeft color="#94A3B8" size={15} strokeWidth={2.2} />
            <Text style={styles.backBtnText}>Return to App</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Render Desktop Admin Dashboard ───────────────────────────────────────
  return (
    <View style={styles.dashboardContainer}>
      {/* Top Application Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.brandRow}>
            <View style={styles.adminBadge}>
              <ShieldAlert color="#D4AF37" size={14} strokeWidth={2.4} />
              <Text style={styles.adminBadgeText}>DESKTOP ADMIN DASHBOARD</Text>
            </View>
            <Text style={styles.dateBadge}>Date: {todayDate} (IST)</Text>
          </View>
          <Text style={styles.consoleTitle}>Connect GOD Central Management</Text>
        </View>

        <View style={styles.topBarActions}>
          <Pressable
            style={({ pressed }) => [styles.webAppBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/')}
          >
            <Eye color="#F8FAFC" size={15} strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>View App</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
            onPress={handleLogout}
          >
            <LogOut color="#ffffff" size={15} strokeWidth={2.2} />
            <Text style={styles.actionBtnText}>Lock & Exit</Text>
          </Pressable>
        </View>
      </View>

      {/* Primary Desktop Tab Navigation Bar */}
      <View style={styles.tabsBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'varadanam' && styles.tabButtonActive]}
          onPress={() => setActiveTab('varadanam')}
        >
          <Sparkles
            color={activeTab === 'varadanam' ? '#8B0000' : '#64748B'}
            size={18}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabButtonText, activeTab === 'varadanam' && styles.tabButtonTextActive]}>
            Varadanam Override
          </Text>
          {overrideEnabled && <View style={styles.activeDot} />}
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'links' && styles.tabButtonActive]}
          onPress={() => setActiveTab('links')}
        >
          <Globe
            color={activeTab === 'links' ? '#8B0000' : '#64748B'}
            size={18}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabButtonText, activeTab === 'links' && styles.tabButtonTextActive]}>
            External & Social Links
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'media' && styles.tabButtonActive]}
          onPress={() => setActiveTab('media')}
        >
          <Database
            color={activeTab === 'media' ? '#8B0000' : '#64748B'}
            size={18}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabButtonText, activeTab === 'media' && styles.tabButtonTextActive]}>
            Cloudflare Media Inventory
          </Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: VARADANAM OVERRIDE (HYBRID MODE)                              */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'varadanam' && (
            <View style={styles.tabSection}>
              {/* Status Header Banner */}
              <View style={[styles.statusCard, overrideEnabled ? styles.statusCardAmber : styles.statusCardGreen]}>
                <View style={styles.statusCardIcon}>
                  {overrideEnabled ? (
                    <AlertCircle color="#D97706" size={24} strokeWidth={2.2} />
                  ) : (
                    <CheckCircle2 color="#059669" size={24} strokeWidth={2.2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusCardTitle}>
                    {overrideEnabled
                      ? 'Manual Override Mode Active'
                      : 'Automated Murli Regex Extraction Active (Default)'}
                  </Text>
                  <Text style={styles.statusCardDesc}>
                    {overrideEnabled
                      ? `The Home Screen Varadanam Card currently displays your custom manual blessing for ${todayDate}. Automated regex is safely bypassed.`
                      : `The Home Screen automatically extracts the daily blessing title sentence from live Malayalam Murli HTML according to Section 3.1.`}
                  </Text>
                </View>

                <View style={styles.switchWrap}>
                  <Text style={styles.switchLabel}>Enable Manual Override</Text>
                  <Switch
                    value={overrideEnabled}
                    onValueChange={(val) => {
                      setOverrideEnabled(val);
                      if (!val) {
                        handleRevertToAutomatedVaradan();
                      }
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#FDE68A' }}
                    thumbColor={overrideEnabled ? '#8B0000' : '#FFFFFF'}
                  />
                </View>
              </View>

              {/* Two-Column Desktop Comparison Grid */}
              <View style={styles.comparisonGrid}>
                {/* Column 1: Automated Murli Regex Extraction */}
                <View style={styles.gridCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>Automated Regex Extraction</Text>
                      <Text style={styles.cardSubtitle}>Section 3.1 Strict Blessing Parser</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.secondarySmallBtn, pressed && styles.btnPressed]}
                      onPress={fetchAutomatedVaradan}
                    >
                      {isAutomatedLoading ? (
                        <ActivityIndicator size="small" color="#8B0000" />
                      ) : (
                        <RefreshCw color="#64748B" size={14} strokeWidth={2.2} />
                      )}
                      <Text style={styles.secondarySmallBtnText}>Re-Parse</Text>
                    </Pressable>
                  </View>

                  <View style={styles.previewBox}>
                    <Text style={styles.previewBoxLabel}>Current Extracted Title Sentence:</Text>
                    {isAutomatedLoading ? (
                      <ActivityIndicator size="small" color="#8B0000" style={{ marginVertical: 20 }} />
                    ) : automatedVaradanText ? (
                      <Text style={styles.extractedText}>{automatedVaradanText}</Text>
                    ) : (
                      <Text style={styles.emptyExtractText}>
                        No blessing extracted yet for today or live network unavailable.
                      </Text>
                    )}
                  </View>

                  <View style={styles.ruleInfoBox}>
                    <Text style={styles.ruleInfoText}>
                      ✓ Matches strictly at Section Header &quot;വരദാനം :-&quot;{'\n'}
                      ✓ Stops strictly at the very first full stop (.){'\n'}
                      ✓ Discards explanation paragraphs, slogans, and full murli text.
                    </Text>
                  </View>
                </View>

                {/* Column 2: Manual Override Controls */}
                <View style={[styles.gridCard, overrideEnabled && styles.gridCardHighlight]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>Manual Blessing Input</Text>
                      <Text style={styles.cardSubtitle}>Single-sentence Malayalam override for {todayDate}</Text>
                    </View>
                  </View>

                  <TextInput
                    style={[styles.textInputArea, !overrideEnabled && styles.textInputDisabled]}
                    placeholder={
                      overrideEnabled
                        ? 'Enter single-sentence Malayalam blessing ending with a full stop (.)...'
                        : 'Toggle "Enable Manual Override" above to activate manual entry.'
                    }
                    placeholderTextColor="#94A3B8"
                    multiline
                    editable={overrideEnabled}
                    value={manualVaradanText}
                    onChangeText={setManualVaradanText}
                  />

                  <View style={styles.counterRow}>
                    <Text style={styles.counterText}>
                      Characters: {manualVaradanText.length} • Valid Malayalam:{' '}
                      {isMalayalamText(manualVaradanText) ? 'Yes' : 'No'}
                    </Text>
                  </View>

                  <View style={styles.actionBtnRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryActionBtn,
                        !overrideEnabled && styles.btnDisabled,
                        pressed && styles.btnPressed,
                      ]}
                      disabled={!overrideEnabled}
                      onPress={handleSaveVaradanOverride}
                    >
                      <Save color="#ffffff" size={16} strokeWidth={2.4} />
                      <Text style={styles.primaryActionBtnText}>Save Manual Blessing</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.dangerActionBtn, pressed && styles.btnPressed]}
                      onPress={handleRevertToAutomatedVaradan}
                    >
                      <RotateCcw color="#DC2626" size={15} strokeWidth={2.2} />
                      <Text style={styles.dangerActionBtnText}>Revert to Automated</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Live Preview Card */}
              <View style={styles.livePreviewCard}>
                <Text style={styles.livePreviewTitle}>HOME SCREEN BLESSING CARD PREVIEW</Text>
                <View style={styles.blessingMockCard}>
                  <View style={styles.mockHeader}>
                    <Sparkles color="#B45309" size={16} strokeWidth={2.4} />
                    <Text style={styles.mockBadgeText}>ഇന്നത്തെ വരദാനം (TODAY&apos;S BLESSING)</Text>
                  </View>
                  <Text style={styles.mockBlessingText}>
                    {overrideEnabled && manualVaradanText.trim()
                      ? manualVaradanText.trim()
                      : automatedVaradanText || 'സർവ്വ ഗുണങ്ങളാലും സമ്പന്നമായി ശാന്തിയുടെയും ശക്തിയുടെയും ദാനം നൽകുന്ന ആത്മാവായി ഭവിക്കട്ടെ.'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: EXTERNAL & SOCIAL LINKS MANAGEMENT                             */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'links' && (
            <View style={styles.tabSection}>
              {/* Header card with save actions */}
              <View style={styles.sectionHeaderCard}>
                <View>
                  <Text style={styles.sectionHeaderTitle}>External & Quick Links Configuration</Text>
                  <Text style={styles.sectionHeaderSub}>
                    Changes saved here immediately update the app without code recompilation.
                  </Text>
                </View>
                <View style={styles.headerBtnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.btnPressed]}
                    onPress={handleSaveLinks}
                  >
                    <Save color="#ffffff" size={16} strokeWidth={2.4} />
                    <Text style={styles.primaryActionBtnText}>Save All Links</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.secondarySmallBtn, pressed && styles.btnPressed]}
                    onPress={handleResetLinksToDefault}
                  >
                    <RotateCcw color="#64748B" size={14} strokeWidth={2.2} />
                    <Text style={styles.secondarySmallBtnText}>Reset Defaults</Text>
                  </Pressable>
                </View>
              </View>

              {/* Core App Destination Links */}
              <View style={styles.cardSection}>
                <Text style={styles.cardGroupTitle}>CORE APP DESTINATIONS</Text>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Official Website URL (Home Screen Button)</Text>
                    <View style={styles.inputWithAction}>
                      <TextInput
                        style={styles.fieldInput}
                        value={websiteUrl}
                        onChangeText={setWebsiteUrl}
                        placeholder="https://www.bkkozhikode.com/"
                        placeholderTextColor="#94A3B8"
                      />
                      <Pressable
                        style={styles.inputActionBtn}
                        onPress={() => Linking.openURL(websiteUrl)}
                        accessibilityLabel="Open Website"
                      >
                        <ExternalLink color="#64748B" size={16} />
                      </Pressable>
                    </View>
                    <Text style={styles.fieldHint}>
                      Links to the &quot;Our Official Website&quot; pill button located beneath the Media Hub on the Home Screen.
                    </Text>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Live Zoom Session Join URL</Text>
                    <View style={styles.inputWithAction}>
                      <TextInput
                        style={styles.fieldInput}
                        value={zoomUrl}
                        onChangeText={setZoomUrl}
                        placeholder="https://zoom.us/j/..."
                        placeholderTextColor="#94A3B8"
                      />
                      <Pressable
                        style={styles.inputActionBtn}
                        onPress={() => Linking.openURL(zoomUrl)}
                        accessibilityLabel="Open Zoom"
                      >
                        <ExternalLink color="#64748B" size={16} />
                      </Pressable>
                    </View>
                    <Text style={styles.fieldHint}>
                      Target URL for the &quot;Live Zoom Session - Tap to Join&quot; banner on the Home Screen.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Social Media Handles */}
              <View style={styles.cardSection}>
                <Text style={styles.cardGroupTitle}>SOCIAL MEDIA PLATFORMS</Text>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Instagram Profile URL</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={socialLinks.instagram}
                      onChangeText={(val) => setSocialLinks((prev) => ({ ...prev, instagram: val }))}
                      placeholder="https://instagram.com/connectgod"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Facebook Page URL</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={socialLinks.facebook}
                      onChangeText={(val) => setSocialLinks((prev) => ({ ...prev, facebook: val }))}
                      placeholder="https://facebook.com/connectgod"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>WhatsApp Group / Contact URL</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={socialLinks.whatsapp}
                      onChangeText={(val) => setSocialLinks((prev) => ({ ...prev, whatsapp: val }))}
                      placeholder="https://wa.me/910000000000"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Telegram Channel URL</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={socialLinks.telegram}
                      onChangeText={(val) => setSocialLinks((prev) => ({ ...prev, telegram: val }))}
                      placeholder="https://t.me/connectgod"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              {/* YouTube Channels Management */}
              <View style={styles.cardSection}>
                <Text style={styles.cardGroupTitle}>YOUTUBE CHANNELS & MEDIA HUBS</Text>
                <View style={styles.channelList}>
                  {socialLinks.youtubeChannels.map((c) => (
                    <View key={c.id} style={styles.channelRow}>
                      <View style={styles.channelInfo}>
                        <Youtube color="#DC2626" size={20} strokeWidth={2.2} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.channelName}>{c.label}</Text>
                          <Text style={styles.channelUrl} numberOfLines={1}>
                            {c.url}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.channelActions}>
                        <Pressable
                          style={styles.iconMiniBtn}
                          onPress={() => Linking.openURL(c.url)}
                          accessibilityLabel="Open Channel"
                        >
                          <ExternalLink color="#64748B" size={15} />
                        </Pressable>
                        <Pressable
                          style={styles.iconMiniBtnDanger}
                          onPress={() => handleRemoveYouTubeChannel(c.id)}
                          accessibilityLabel="Delete Channel"
                        >
                          <Trash2 color="#DC2626" size={15} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Add New Channel Form */}
                <View style={styles.addChannelCard}>
                  <Text style={styles.addChannelTitle}>Add Custom Channel</Text>
                  <View style={styles.addChannelFormRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      placeholder="Channel Label (e.g., BK Peace Village)"
                      placeholderTextColor="#94A3B8"
                      value={newChannelLabel}
                      onChangeText={setNewChannelLabel}
                    />
                    <TextInput
                      style={[styles.fieldInput, { flex: 2 }]}
                      placeholder="YouTube Channel URL"
                      placeholderTextColor="#94A3B8"
                      value={newChannelUrl}
                      onChangeText={setNewChannelUrl}
                    />
                    <Pressable
                      style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
                      onPress={handleAddYouTubeChannel}
                    >
                      <Plus color="#ffffff" size={16} strokeWidth={2.4} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: CLOUDFLARE MEDIA INVENTORY                                     */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'media' && (
            <View style={styles.tabSection}>
              {/* Media KPI Summary Banner */}
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{R2_FOLDERS.length}</Text>
                  <Text style={styles.kpiLabel}>Cloudflare R2 Folders</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{totalFolderTracks}</Text>
                  <Text style={styles.kpiLabel}>Tracks in Active Folder</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{totalFolderSizeMb} MB</Text>
                  <Text style={styles.kpiLabel}>Folder Size</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiValue, { color: '#059669', fontSize: 16 }]}>1-to-1 STRICT</Text>
                  <Text style={styles.kpiLabel}>Tag Isolation Status</Text>
                </View>
              </View>

              {/* Category Filter Chips */}
              <View style={styles.filterChipRow}>
                {['All', 'Commentary', 'Songs', 'Music', 'Ringtones', 'Karaoke', 'Occasions'].map((grp) => (
                  <Pressable
                    key={grp}
                    style={[styles.groupChip, selectedGroupFilter === grp && styles.groupChipActive]}
                    onPress={() => setSelectedGroupFilter(grp)}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        selectedGroupFilter === grp && styles.groupChipTextActive,
                      ]}
                    >
                      {grp}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Desktop Master-Detail Layout */}
              <View style={styles.mediaMasterDetail}>
                {/* Left Folder Strip */}
                <View style={styles.folderSidebar}>
                  <Text style={styles.folderSidebarTitle}>
                    FOLDERS ({filteredFolders.length})
                  </Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
                    {filteredFolders.map((f) => {
                      const isSelected = selectedFolder.id === f.id;
                      return (
                        <Pressable
                          key={f.id}
                          style={({ pressed }) => [
                            styles.folderRowItem,
                            isSelected && styles.folderRowItemActive,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() => setSelectedFolder(f)}
                        >
                          <Folder
                            color={isSelected ? '#8B0000' : '#64748B'}
                            size={16}
                            strokeWidth={isSelected ? 2.4 : 2}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.folderItemLabel, isSelected && styles.folderItemLabelActive]}
                              numberOfLines={1}
                            >
                              {f.label}
                            </Text>
                            <Text style={styles.folderItemTag} numberOfLines={1}>
                              Tag: {f.tag}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Right Tracks Explorer */}
                <View style={styles.trackContentArea}>
                  {/* Active Folder Header */}
                  <View style={styles.trackContentHeader}>
                    <View>
                      <Text style={styles.activeFolderHeading}>{selectedFolder.label}</Text>
                      <Text style={styles.activeFolderSub}>
                        Bucket Folder: <Text style={{ fontFamily: FONTS.interSemiBold }}>{selectedFolder.folder}</Text> • Tag: <Text style={styles.tagBadge}>{selectedFolder.tag}</Text>
                      </Text>
                    </View>

                    <View style={styles.headerRightToolRow}>
                      <View style={styles.searchBarWrap}>
                        <Search color="#94A3B8" size={15} />
                        <TextInput
                          style={styles.searchBarInput}
                          placeholder="Search tracks in folder..."
                          placeholderTextColor="#94A3B8"
                          value={mediaSearchQuery}
                          onChangeText={setMediaSearchQuery}
                        />
                      </View>

                      <Pressable
                        style={({ pressed }) => [styles.secondarySmallBtn, pressed && styles.btnPressed]}
                        onPress={() => loadFolderTracks(selectedFolder.folder)}
                      >
                        <RefreshCw color="#64748B" size={14} />
                        <Text style={styles.secondarySmallBtnText}>Reload</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Tracks Content Table / List */}
                  {loadingTracks ? (
                    <View style={styles.centerLoadingBox}>
                      <ActivityIndicator size="large" color="#8B0000" />
                      <Text style={styles.centerLoadingText}>Streaming file manifest from Cloudflare R2...</Text>
                    </View>
                  ) : visibleTracks.length === 0 ? (
                    <View style={styles.centerLoadingBox}>
                      <FileAudio color="#94A3B8" size={44} strokeWidth={1.8} />
                      <Text style={styles.emptyTitle}>No audio tracks found in this folder</Text>
                      <Text style={styles.emptySubtitle}>Upload audio tracks into Cloudflare R2 bucket.</Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                      <View style={styles.trackCardList}>
                        {visibleTracks.map((t, idx) => {
                          const cleanTitle = (t.name || t.key || '').replace(/\.[^/.]+$/, '').trim();
                          const isThisPlaying = playingUrl === t.url;
                          const isCopied = copiedKey === t.key;
                          const sizeMb = t.size ? (t.size / (1024 * 1024)).toFixed(2) + ' MB' : '';

                          return (
                            <View key={t.key || t.url || idx} style={styles.trackItemCard}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.playCircleBtn,
                                  isThisPlaying && styles.playCircleBtnActive,
                                  pressed && styles.btnPressed,
                                ]}
                                onPress={() => handleTogglePreview(t.url)}
                                accessibilityLabel="Play track"
                              >
                                {isThisPlaying ? (
                                  <Pause color="#ffffff" size={15} strokeWidth={2.4} />
                                ) : (
                                  <Play color="#8B0000" size={15} strokeWidth={2.4} />
                                )}
                              </Pressable>

                              <View style={styles.trackInfo}>
                                <Text style={styles.trackItemTitle} numberOfLines={1}>
                                  {cleanTitle}
                                </Text>
                                <Text style={styles.trackItemSub} numberOfLines={1}>
                                  Key: {t.key || t.name} {sizeMb ? `• ${sizeMb}` : ''}
                                </Text>
                              </View>

                              <View style={styles.trackItemActions}>
                                <Pressable
                                  style={({ pressed }) => [
                                    styles.copyPillBtn,
                                    isCopied && styles.copyPillBtnCopied,
                                    pressed && styles.btnPressed,
                                  ]}
                                  onPress={() => handleCopyUrl(t)}
                                >
                                  {isCopied ? (
                                    <Check color="#059669" size={13} strokeWidth={2.4} />
                                  ) : (
                                    <Copy color="#64748B" size={13} strokeWidth={2.2} />
                                  )}
                                  <Text style={[styles.copyPillBtnText, isCopied && { color: '#059669' }]}>
                                    {isCopied ? 'Copied' : 'Copy Stream URL'}
                                  </Text>
                                </Pressable>

                                <Pressable
                                  style={({ pressed }) => [styles.openPillBtn, pressed && styles.btnPressed]}
                                  onPress={() => Linking.openURL(t.url)}
                                >
                                  <ExternalLink color="#64748B" size={13} />
                                  <Text style={styles.openPillBtnText}>Open</Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Auth Screen Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    ...SHADOWS.md,
  },
  authIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  authTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 20,
    color: '#F8FAFC',
    marginBottom: 4,
    textAlign: 'center',
  },
  authSubtitle: {
    fontFamily: FONTS.inter,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  pinInputWrap: {
    width: '100%',
    marginBottom: SPACING.sm,
  },
  pinInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontFamily: FONTS.interSemiBold,
    fontSize: 18,
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 6,
  },
  errorText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12,
    color: '#EF4444',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  authBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B0000',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    marginTop: 6,
  },
  authBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: SPACING.sm,
  },
  backBtnText: {
    fontFamily: FONTS.inter,
    fontSize: 13,
    color: '#94A3B8',
  },

  // Main Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topBarLeft: {
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  adminBadgeText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 10.5,
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  dateBadge: {
    fontFamily: FONTS.interMedium,
    fontSize: 11,
    color: '#94A3B8',
  },
  consoleTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 18,
    color: '#F8FAFC',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B0000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12.5,
    color: '#ffffff',
  },

  // Primary Tabs Bar
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: SPACING.xl,
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#D4AF37',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabButtonText: {
    fontFamily: FONTS.interMedium,
    fontSize: 13.5,
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    fontFamily: FONTS.interSemiBold,
    color: '#F8FAFC',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginLeft: 4,
  },

  // Content Container
  scrollContent: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 1140, // Standard desktop max-w-6xl
  },
  tabSection: {
    gap: SPACING.lg,
  },

  // Status Banner
  statusCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
  },
  statusCardGreen: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: '#059669',
  },
  statusCardAmber: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
  },
  statusCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 15,
    color: '#F8FAFC',
  },
  statusCardDesc: {
    fontFamily: FONTS.inter,
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  switchWrap: {
    alignItems: 'center',
    gap: 4,
    paddingLeft: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
  },
  switchLabel: {
    fontFamily: FONTS.interMedium,
    fontSize: 11,
    color: '#94A3B8',
  },

  // Comparison Grid
  comparisonGrid: {
    flexDirection: 'row',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  gridCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#334155',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  gridCardHighlight: {
    borderColor: '#D97706',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    gap: 2,
  },
  cardTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 16,
    color: '#F8FAFC',
  },
  cardSubtitle: {
    fontFamily: FONTS.inter,
    fontSize: 12,
    color: '#94A3B8',
  },
  previewBox: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewBoxLabel: {
    fontFamily: FONTS.interMedium,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  extractedText: {
    fontFamily: FONTS.interMedium,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#F8FAFC',
  },
  emptyExtractText: {
    fontFamily: FONTS.inter,
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  ruleInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  ruleInfoText: {
    fontFamily: FONTS.inter,
    fontSize: 11.5,
    lineHeight: 18,
    color: '#94A3B8',
  },
  textInputArea: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#475569',
    padding: SPACING.md,
    minHeight: 100,
    fontFamily: FONTS.interMedium,
    fontSize: 14,
    color: '#F8FAFC',
    textAlignVertical: 'top',
  },
  textInputDisabled: {
    opacity: 0.5,
    backgroundColor: '#1E293B',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  counterText: {
    fontFamily: FONTS.inter,
    fontSize: 11,
    color: '#94A3B8',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B0000',
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  primaryActionBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 13.5,
    color: '#ffffff',
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  dangerActionBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12.5,
    color: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Live Home Preview Card
  livePreviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#334155',
    gap: SPACING.md,
  },
  livePreviewTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 11.5,
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  blessingMockCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: SPACING.lg,
    gap: 10,
    ...SHADOWS.sm,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockBadgeText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 12,
    color: '#92400E',
    letterSpacing: 0.4,
  },
  mockBlessingText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 14.5,
    lineHeight: 23,
    color: '#1F2937',
  },

  // Tab 2: Links Management
  sectionHeaderCard: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  sectionHeaderTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 17,
    color: '#F8FAFC',
  },
  sectionHeaderSub: {
    fontFamily: FONTS.inter,
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardSection: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#334155',
    gap: SPACING.md,
  },
  cardGroupTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 12,
    color: '#D4AF37',
    letterSpacing: 0.8,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  formField: {
    flex: 1,
    minWidth: 280,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FONTS.interMedium,
    fontSize: 13,
    color: '#F8FAFC',
  },
  fieldInput: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.inter,
    fontSize: 13.5,
    color: '#F8FAFC',
  },
  inputWithAction: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  inputActionBtn: {
    paddingHorizontal: 12,
  },
  fieldHint: {
    fontFamily: FONTS.inter,
    fontSize: 11,
    color: '#64748B',
  },
  channelList: {
    gap: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  channelName: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 13,
    color: '#F8FAFC',
  },
  channelUrl: {
    fontFamily: FONTS.inter,
    fontSize: 11,
    color: '#94A3B8',
  },
  channelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconMiniBtn: {
    padding: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#1E293B',
  },
  iconMiniBtnDanger: {
    padding: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  addChannelCard: {
    marginTop: 8,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  addChannelTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 12.5,
    color: '#F8FAFC',
  },
  addChannelFormRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B0000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },

  // Tab 3: Media Inventory
  kpiGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  kpiValue: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 22,
    color: '#F8FAFC',
  },
  kpiLabel: {
    fontFamily: FONTS.inter,
    fontSize: 12,
    color: '#94A3B8',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupChipActive: {
    backgroundColor: '#8B0000',
    borderColor: '#D4AF37',
  },
  groupChipText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12,
    color: '#94A3B8',
  },
  groupChipTextActive: {
    fontFamily: FONTS.interSemiBold,
    color: '#FFFFFF',
  },
  mediaMasterDetail: {
    flexDirection: 'row',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  folderSidebar: {
    width: 280,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#334155',
    padding: SPACING.md,
    gap: 8,
  },
  folderSidebarTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 11,
    color: '#64748B',
    paddingHorizontal: 6,
    letterSpacing: 0.6,
  },
  folderRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: 2,
  },
  folderRowItemActive: {
    backgroundColor: 'rgba(139, 0, 0, 0.25)',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  folderItemLabel: {
    fontFamily: FONTS.interMedium,
    fontSize: 13,
    color: '#CBD5E1',
  },
  folderItemLabelActive: {
    fontFamily: FONTS.interSemiBold,
    color: '#F8FAFC',
  },
  folderItemTag: {
    fontFamily: FONTS.inter,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  trackContentArea: {
    flex: 1,
    minWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#334155',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  trackContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  activeFolderHeading: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 18,
    color: '#F8FAFC',
  },
  activeFolderSub: {
    fontFamily: FONTS.inter,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  tagBadge: {
    fontFamily: FONTS.interMedium,
    fontSize: 11,
    color: '#D4AF37',
  },
  headerRightToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 220,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBarInput: {
    flex: 1,
    fontFamily: FONTS.inter,
    fontSize: 12,
    color: '#F8FAFC',
  },
  trackCardList: {
    gap: 6,
    paddingTop: 4,
  },
  trackItemCard: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  playCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircleBtnActive: {
    backgroundColor: '#8B0000',
  },
  trackInfo: {
    flex: 1,
  },
  trackItemTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 13,
    color: '#F8FAFC',
  },
  trackItemSub: {
    fontFamily: FONTS.inter,
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  trackItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#334155',
  },
  copyPillBtnCopied: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#059669',
  },
  copyPillBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  openPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#334155',
  },
  openPillBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  secondarySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  secondarySmallBtnText: {
    fontFamily: FONTS.interMedium,
    fontSize: 12,
    color: '#CBD5E1',
  },
  centerLoadingBox: {
    padding: SPACING['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerLoadingText: {
    fontFamily: FONTS.interMedium,
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyTitle: {
    fontFamily: FONTS.interSemiBold,
    fontSize: 15,
    color: '#CBD5E1',
    marginTop: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.inter,
    fontSize: 12,
    color: '#64748B',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
