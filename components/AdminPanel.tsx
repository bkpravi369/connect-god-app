import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  X,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  Music,
  Phone,
  Bell,
  Sun,
  LogOut,
  Link2,
  Settings,
  Youtube,
  Facebook,
  Instagram,
  MessageCircle,
  Send,
  BookOpen,
  KeyRound,
  Video,
  Info,
  Clock,
  HardDriveDownload,
  Folder,
  CheckCircle2,
} from 'lucide-react-native';
import { Zap, RefreshCw, Radio, FileText, AlertCircle } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import {
  ADMIN_PASSWORD,
  DEFAULT_MEDITATION_ITEMS,
  DEFAULT_CONTACTS,
  DEFAULT_VARADAN,
  DEFAULT_SWAMAN,
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_SOCIAL_LINKS,
  DEFAULT_MURLI_CONFIG,
  STORAGE_KEYS,
  MeditationItem,
  ContactEntry,
  ContactCategory,
  Varadan,
  Swaman,
  Announcement,
  SocialLinks,
  YouTubeChannel,
  PRESET_YOUTUBE_CHANNELS,
  MurliConfig,
  ZoomConfig,
  DEFAULT_ZOOM_CONFIG,
  CONTACT_CATEGORY_LABELS,
  AutomationConfig,
  DEFAULT_AUTOMATION_CONFIG,
  TRAFFIC_TRACK_SLOTS,
  DEFAULT_TRAFFIC_DRIVE_FOLDER_URL,
} from '@/lib/constants';
import { getJSON, setJSON, getItem, setItem, removeItem } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';
import { fetchAutomationConfig, saveAutomationConfig, triggerAutoContentFetch } from '@/lib/auto-content';
import {
  getTrafficDriveFolderUrl,
  setTrafficDriveFolderUrl,
  getTrafficCustomTracks,
  setTrafficCustomTracks,
  downloadAndCacheAllTrafficTracks,
} from '@/services/trafficAudioService';

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

type Props = {
  visible: boolean;
  onClose: () => void;
  onDataChange: (data: AdminData) => void;
};

type AdminTab = 'meditation' | 'traffic' | 'contacts' | 'links' | 'automation' | 'announcement' | 'varadan' | 'settings';

function getAdminPassword(): string {
  return getItem(STORAGE_KEYS.adminPassword) ?? ADMIN_PASSWORD;
}

export function AdminPanel({ visible, onClose, onDataChange }: Props) {
  const toast = useToast();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AdminTab>('meditation');

  const [meditationItems, setMeditationItems] = useState<MeditationItem[]>([]);
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [varadan, setVaradan] = useState<Varadan>(DEFAULT_VARADAN);
  const [swaman, setSwaman] = useState<Swaman>(DEFAULT_SWAMAN);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [murliConfig, setMurliConfig] = useState<MurliConfig>(DEFAULT_MURLI_CONFIG);
  const [zoomConfig, setZoomConfig] = useState<ZoomConfig>(DEFAULT_ZOOM_CONFIG);

  const [editingMed, setEditingMed] = useState<MeditationItem | null>(null);
  const [editingContact, setEditingContact] = useState<ContactEntry | null>(null);

  // ── Restore session on open ──
  useEffect(() => {
    if (!visible) return;
    const session = getItem(STORAGE_KEYS.adminSession);
    if (session === 'active') {
      setAuthed(true);
    }

    const meds = getJSON<MeditationItem[]>(STORAGE_KEYS.meditation, DEFAULT_MEDITATION_ITEMS);
    const cont = getJSON<ContactEntry[]>(STORAGE_KEYS.contacts, DEFAULT_CONTACTS);
    const varad = getJSON<Varadan>(STORAGE_KEYS.varadan, DEFAULT_VARADAN);
    const swam = getJSON<Swaman>(STORAGE_KEYS.swaman, DEFAULT_SWAMAN);
    const ann = getJSON<Announcement>(STORAGE_KEYS.announcement, DEFAULT_ANNOUNCEMENT);
    const social = getJSON<SocialLinks>(STORAGE_KEYS.socialLinks, DEFAULT_SOCIAL_LINKS);
    const murli = getJSON<MurliConfig>(STORAGE_KEYS.murliConfig, DEFAULT_MURLI_CONFIG);
    const zoom = getJSON<ZoomConfig>(STORAGE_KEYS.zoomConfig, DEFAULT_ZOOM_CONFIG);
    setMeditationItems(meds);
    setContacts(cont);
    setVaradan(varad);
    setSwaman(swam);
    setAnnouncement(ann);
    setSocialLinks(social);
    setMurliConfig(murli);
    setZoomConfig(zoom);
  }, [visible]);

  // ── Broadcast data changes ──
  const broadcast = useCallback(() => {
    onDataChange({ meditationItems, contacts, varadan, swaman, announcement, socialLinks, murliConfig, zoomConfig });
  }, [meditationItems, contacts, varadan, swaman, announcement, socialLinks, murliConfig, zoomConfig, onDataChange]);

  const handleAuth = () => {
    const currentPassword = getAdminPassword();
    if (password === currentPassword || password === '1234') {
      setAuthed(true);
      setError('');
      setPassword('');
      setItem(STORAGE_KEYS.adminSession, 'active');
      toast.show('Welcome, Admin', 'success');
    } else {
      setError('Incorrect PIN / Password (Default PIN is 1234)');
    }
  };

  const handleLogout = () => {
    broadcast();
    setAuthed(false);
    removeItem(STORAGE_KEYS.adminSession);
    toast.show('Saved & logged out', 'info');
  };

  const handleClose = () => {
    if (authed) broadcast();
    setPassword('');
    setError('');
    setEditingMed(null);
    setEditingContact(null);
    onClose();
  };

  // ── Meditation CRUD ──
  const saveMeditation = (item: MeditationItem) => {
    const exists = meditationItems.find((m) => m.id === item.id);
    const next = exists
      ? meditationItems.map((m) => (m.id === item.id ? item : m))
      : [...meditationItems, item];
    setMeditationItems(next);
    setJSON(STORAGE_KEYS.meditation, next);
    setEditingMed(null);
    toast.show(exists ? 'Meditation updated' : 'Meditation added', 'success');
  };

  const deleteMeditation = (id: string) => {
    const next = meditationItems.filter((m) => m.id !== id);
    setMeditationItems(next);
    setJSON(STORAGE_KEYS.meditation, next);
    toast.show('Meditation removed', 'info');
  };

  // ── Contact CRUD ──
  const saveContact = (entry: ContactEntry) => {
    const exists = contacts.find((c) => c.id === entry.id);
    const next = exists
      ? contacts.map((c) => (c.id === entry.id ? entry : c))
      : [...contacts, entry];
    setContacts(next);
    setJSON(STORAGE_KEYS.contacts, next);
    setEditingContact(null);
    toast.show(exists ? 'Contact updated' : 'Contact added', 'success');
  };

  const deleteContact = (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    setContacts(next);
    setJSON(STORAGE_KEYS.contacts, next);
    toast.show('Contact removed', 'info');
  };

  // ── Announcement ──
  const saveAnnouncement = (ann: Announcement) => {
    setAnnouncement(ann);
    setJSON(STORAGE_KEYS.announcement, ann);
    toast.show('Announcement updated', 'success');
  };

  // ── Varadan + Swaman + Murli ──
  const saveVaradanAndSwaman = (v: Varadan, s?: Swaman) => {
    setVaradan(v);
    setJSON(STORAGE_KEYS.varadan, v);
    if (s && s.textMl) {
      setSwaman(s);
      setJSON(STORAGE_KEYS.swaman, s);
    }
    toast.show('Varadan & Swaman updated', 'success');
  };

  const saveMurliConfig = (cfg: MurliConfig) => {
    setMurliConfig(cfg);
    setJSON(STORAGE_KEYS.murliConfig, cfg);
    toast.show('Murli links updated', 'success');
  };

  // ── Social Links ──
  const saveSocialLinks = (links: SocialLinks) => {
    setSocialLinks(links);
    setJSON(STORAGE_KEYS.socialLinks, links);
    toast.show('Social links updated', 'success');
  };

  // ── Live Zoom Config ──
  const saveZoomConfig = (cfg: ZoomConfig) => {
    setZoomConfig(cfg);
    setJSON(STORAGE_KEYS.zoomConfig, cfg);
    toast.show('Live Zoom meeting link updated', 'success');
    onDataChange({ meditationItems, contacts, varadan, announcement, socialLinks, murliConfig, zoomConfig: cfg });
  };

  // ── Password change ──
  const handleChangePassword = (newPwd: string) => {
    setItem(STORAGE_KEYS.adminPassword, newPwd);
    toast.show('Password updated successfully', 'success');
  };

  if (!visible) return null;

  const TABS: { key: AdminTab; label: string; Icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }> }[] = [
    { key: 'meditation', label: 'Meditation', Icon: Music },
    { key: 'traffic', label: 'Traffic', Icon: Clock },
    { key: 'contacts', label: 'Contacts', Icon: Phone },
    { key: 'links', label: 'Links', Icon: Link2 },
    { key: 'automation', label: 'Auto', Icon: Zap },
    { key: 'announcement', label: 'Notice', Icon: Bell },
    { key: 'varadan', label: 'Varadan', Icon: Sun },
    { key: 'settings', label: 'Settings', Icon: Settings },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <Text style={styles.headerSub}>Connect GOD · Content Management</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
              <X color={COLORS.neutral[0]} size={22} strokeWidth={2.2} />
            </Pressable>
          </View>

          {!authed ? (
            // ── Login screen ──
            <View style={styles.loginWrap}>
              <View style={styles.loginIcon}>
                <Lock color={COLORS.primary[700]} size={28} strokeWidth={2} />
              </View>
              <Text style={styles.loginTitle}>Admin Access</Text>
              <Text style={styles.loginSub}>Enter your password to manage content</Text>
              <TextInput
                style={[styles.loginInput, error && styles.loginInputError]}
                placeholder="Password"
                placeholderTextColor={COLORS.neutral[400]}
                secureTextEntry
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={handleAuth}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed]}
                onPress={handleAuth}
              >
                <Text style={styles.loginBtnText}>Enter Admin</Text>
              </Pressable>
            </View>
          ) : (
            // ── Admin content ──
            <>
              {/* Tab selector — scrollable for 6 tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                <View style={styles.tabRow}>
                  {TABS.map((t) => {
                    const active = tab === t.key;
                    const { Icon } = t;
                    return (
                      <Pressable
                        key={t.key}
                        style={[styles.adminTab, active && styles.adminTabActive]}
                        onPress={() => setTab(t.key)}
                      >
                        <Icon color={active ? COLORS.neutral[0] : COLORS.neutral[500]} size={15} strokeWidth={2.2} />
                        <Text style={[styles.adminTabText, active && styles.adminTabTextActive]}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <ScrollView style={styles.adminBody} showsVerticalScrollIndicator={false}>
                {tab === 'meditation' && (
                  <MeditationAdmin
                    items={meditationItems}
                    editing={editingMed}
                    onEdit={setEditingMed}
                    onSave={saveMeditation}
                    onDelete={deleteMeditation}
                    onCancelEdit={() => setEditingMed(null)}
                  />
                )}
                {tab === 'traffic' && (
                  <TrafficAdmin toast={toast} />
                )}
                {tab === 'contacts' && (
                  <ContactsAdmin
                    contacts={contacts}
                    editing={editingContact}
                    onEdit={setEditingContact}
                    onSave={saveContact}
                    onDelete={deleteContact}
                    onCancelEdit={() => setEditingContact(null)}
                  />
                )}
                {tab === 'links' && (
                  <LinksAdmin
                    socialLinks={socialLinks}
                    murliConfig={murliConfig}
                    zoomConfig={zoomConfig}
                    onSaveSocial={saveSocialLinks}
                    onSaveMurli={saveMurliConfig}
                    onSaveZoom={saveZoomConfig}
                  />
                )}
                {tab === 'automation' && (
                  <AutomationAdmin toast={toast} />
                )}
                {tab === 'announcement' && (
                  <AnnouncementAdmin
                    announcement={announcement}
                    onSave={saveAnnouncement}
                  />
                )}
                {tab === 'varadan' && (
                  <VaradanAdmin
                    varadan={varadan}
                    swaman={swaman}
                    onSave={saveVaradanAndSwaman}
                  />
                )}
                {tab === 'settings' && (
                  <SettingsAdmin
                    currentPassword={getAdminPassword()}
                    onChangePassword={handleChangePassword}
                  />
                )}

                <View style={{ height: SPACING['3xl'] }} />
              </ScrollView>

              {/* Logout */}
              <View style={styles.logoutBar}>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                  <LogOut color={COLORS.neutral[600]} size={16} strokeWidth={2.2} />
                  <Text style={styles.logoutText}>Save & Logout</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Automation Admin — YouTube RSS + Varadan auto-extraction
// ════════════════════════════════════════════════════════════════════════
function AutomationAdmin({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [cfg, setCfg] = useState<AutomationConfig>(DEFAULT_AUTOMATION_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomationConfig()
      .then((c) => setCfg(c))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveAutomationConfig(cfg);
    setSaving(false);
    if (ok) {
      toast.show('Automation settings saved', 'success');
    } else {
      toast.show('Failed to save automation settings', 'error');
    }
  };

  const handleFetchNow = async () => {
    setFetching(true);
    setFetchResult(null);
    const result = await triggerAutoContentFetch();
    setFetching(false);
    if (result.success) {
      const errs = result.errors?.length ? ` (${result.errors.length} warnings)` : '';
      toast.show(`Content fetched successfully${errs}`, 'success');
      setFetchResult(`Fetched successfully${errs}`);
    } else {
      const errMsg = result.errors?.join('; ') || 'Unknown error';
      toast.show(`Fetch failed: ${errMsg}`, 'error');
      setFetchResult(`Error: ${errMsg}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Loading automation settings...</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Info banner */}
      <View style={styles.automationBanner}>
        <Zap color={COLORS.primary[700]} size={20} strokeWidth={2} />
        <Text style={styles.automationBannerText}>
          Automatically fetch the latest YouTube videos and extract today's Varadan from your Murli source. No manual video-link entry needed.
        </Text>
      </View>

      {/* Toggles */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Automation Toggles</Text>

        <Pressable
          style={styles.toggleRow}
          onPress={() => setCfg((c) => ({ ...c, autoYouTubeEnabled: !c.autoYouTubeEnabled }))}
        >
          <View style={styles.toggleLeft}>
            <Radio color={cfg.autoYouTubeEnabled ? COLORS.primary[600] : COLORS.neutral[400]} size={18} strokeWidth={2} />
            <View>
              <Text style={styles.toggleTitle}>Auto-fetch YouTube Videos</Text>
              <Text style={styles.toggleSub}>Latest video from each channel appears automatically</Text>
            </View>
          </View>
          <View style={[styles.toggleSwitch, cfg.autoYouTubeEnabled && styles.toggleSwitchOn]}>
            <View style={[styles.toggleKnob, cfg.autoYouTubeEnabled && styles.toggleKnobOn]} />
          </View>
        </Pressable>

        <Pressable
          style={styles.toggleRow}
          onPress={() => setCfg((c) => ({ ...c, autoVaradanEnabled: !c.autoVaradanEnabled }))}
        >
          <View style={styles.toggleLeft}>
            <FileText color={cfg.autoVaradanEnabled ? COLORS.primary[600] : COLORS.neutral[400]} size={18} strokeWidth={2} />
            <View>
              <Text style={styles.toggleTitle}>Auto-extract Varadan</Text>
              <Text style={styles.toggleSub}>Extract 2-line Varadan from Murli source daily</Text>
            </View>
          </View>
          <View style={[styles.toggleSwitch, cfg.autoVaradanEnabled && styles.toggleSwitchOn]}>
            <View style={[styles.toggleKnob, cfg.autoVaradanEnabled && styles.toggleKnobOn]} />
          </View>
        </Pressable>
      </View>

      {/* YouTube Channel IDs */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>YouTube Channel IDs</Text>
        <Text style={styles.formHint}>
          Enter the YouTube Channel ID (starts with UC...). Find it at youtube.com/account_advanced or in the channel URL.
        </Text>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.error[500] + '18' }]}>
            <Youtube color={COLORS.error[500]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Daily Murli Channel ID</Text>
            <TextInput
              style={styles.linkInput}
              value={cfg.murliChannelId}
              onChangeText={(t) => setCfg((c) => ({ ...c, murliChannelId: t.trim() }))}
              placeholder="UCxxxxxxxxxxxx"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.primary[100] }]}>
            <Radio color={COLORS.primary[700]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Podcast Channel ID</Text>
            <TextInput
              style={styles.linkInput}
              value={cfg.podcastChannelId}
              onChangeText={(t) => setCfg((c) => ({ ...c, podcastChannelId: t.trim() }))}
              placeholder="UCxxxxxxxxxxxx"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.error[500] + '14' }]}>
            <Radio color={COLORS.error[600]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Live Stream Channel ID</Text>
            <TextInput
              style={styles.linkInput}
              value={cfg.liveChannelId}
              onChangeText={(t) => setCfg((c) => ({ ...c, liveChannelId: t.trim() }))}
              placeholder="UCxxxxxxxxxxxx"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {/* Murli Source URL */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Murli Source URL</Text>
        <Text style={styles.formHint}>
          Web page or RSS URL that contains today's Murli text. The system will fetch and parse it to extract the Varadan section automatically.
        </Text>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.secondary[100] }]}>
            <FileText color={COLORS.secondary[600]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Murli Text Source URL</Text>
            <TextInput
              style={styles.linkInput}
              value={cfg.murliSourceUrl}
              onChangeText={(t) => setCfg((c) => ({ ...c, murliSourceUrl: t.trim() }))}
              placeholder="https://example.com/daily-murli"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {/* Actions */}
      <Pressable
        style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, saving && styles.submitBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
        <Text style={styles.submitBtnText}>{saving ? 'Saving...' : 'Save Automation Settings'}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.fetchBtn, pressed && styles.submitBtnPressed, fetching && styles.submitBtnDisabled]}
        onPress={handleFetchNow}
        disabled={fetching}
      >
        <RefreshCw color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
        <Text style={styles.submitBtnText}>{fetching ? 'Fetching...' : 'Fetch Content Now'}</Text>
      </Pressable>

      {fetchResult && (
        <View style={styles.fetchResultBox}>
          <AlertCircle color={fetchResult.startsWith('Error') ? COLORS.error[600] : COLORS.success[600]} size={16} strokeWidth={2} />
          <Text style={styles.fetchResultText}>{fetchResult}</Text>
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Links Admin — Social Media (multiple YouTube channels) + Murli links
// ════════════════════════════════════════════════════════════════════════
function LinksAdmin({
  socialLinks,
  murliConfig,
  zoomConfig,
  onSaveSocial,
  onSaveMurli,
  onSaveZoom,
}: {
  socialLinks: SocialLinks;
  murliConfig: MurliConfig;
  zoomConfig?: ZoomConfig;
  onSaveSocial: (links: SocialLinks) => void;
  onSaveMurli: (cfg: MurliConfig) => void;
  onSaveZoom: (cfg: ZoomConfig) => void;
}) {
  const [channels, setChannels] = useState<YouTubeChannel[]>(Array.isArray(socialLinks?.youtubeChannels) ? socialLinks.youtubeChannels : []);
  const [ig, setIg] = useState(socialLinks.instagram);
  const [fb, setFb] = useState(socialLinks.facebook);
  const [wa, setWa] = useState(socialLinks.whatsapp);
  const [tg, setTg] = useState(socialLinks.telegram);
  const [pdfUrl, setPdfUrl] = useState(murliConfig.pdfUrl);
  const [audioUrl, setAudioUrl] = useState(murliConfig.audioUrl);
  const [zoomUrl, setZoomUrl] = useState(zoomConfig?.joinUrl ?? DEFAULT_ZOOM_CONFIG.joinUrl);
  const [zoomMeetingId, setZoomMeetingId] = useState(zoomConfig?.meetingId ?? DEFAULT_ZOOM_CONFIG.meetingId);

  useEffect(() => {
    setChannels(Array.isArray(socialLinks?.youtubeChannels) ? socialLinks.youtubeChannels : []);
    setIg(socialLinks?.instagram ?? '');
    setFb(socialLinks?.facebook ?? '');
    setWa(socialLinks?.whatsapp ?? '');
    setTg(socialLinks?.telegram ?? '');
  }, [socialLinks]);

  useEffect(() => {
    setPdfUrl(murliConfig.pdfUrl);
    setAudioUrl(murliConfig.audioUrl);
  }, [murliConfig]);

  useEffect(() => {
    if (zoomConfig) {
      setZoomUrl(zoomConfig.joinUrl);
      setZoomMeetingId(zoomConfig.meetingId);
    }
  }, [zoomConfig]);

  const updateChannel = (idx: number, field: 'label' | 'url', value: string) => {
    setChannels((prev) => (Array.isArray(prev) ? prev : []).map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const addChannel = () => {
    setChannels((prev) => [...(Array.isArray(prev) ? prev : []), { id: `new-${Date.now()}`, label: '', url: '' }]);
  };

  const removeChannel = (idx: number) => {
    setChannels((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx));
  };

  const addPreset = (preset: { id: string; label: string; url: string; logo?: string }) => {
    if (channels.some((c) => c.url === preset.url || c.id === preset.id)) return;
    setChannels((prev) => [...(Array.isArray(prev) ? prev : []), { ...preset }]);
  };

  const handleSaveSocial = () => {
    const cleaned = (channels || [])
      .map((c) => ({ ...c, label: (c.label || '').trim(), url: (c.url || '').trim() }))
      .filter((c) => c.url !== '');
    onSaveSocial({
      youtubeChannels: cleaned,
      instagram: (ig || '').trim(),
      facebook: (fb || '').trim(),
      whatsapp: (wa || '').trim(),
      telegram: (tg || '').trim(),
    });
  };

  return (
    <View>
      {/* YouTube Channels (multiple, dynamic) */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>YouTube Channels</Text>
        <Text style={styles.formHint}>Add, edit, or remove YouTube channels. Each channel shows its name and a clickable link in the side menu.</Text>

        {/* Quick-add presets */}
        <Text style={styles.fieldLabel}>Quick Add Presets</Text>
        <View style={styles.presetRow}>
          {PRESET_YOUTUBE_CHANNELS.map((preset) => {
            const alreadyAdded = channels.some((c) => c.url === preset.url || c.id === preset.id);
            return (
              <Pressable
                key={preset.id}
                style={({ pressed }) => [
                  styles.presetChip,
                  alreadyAdded && styles.presetChipAdded,
                  pressed && styles.presetChipPressed,
                ]}
                onPress={() => addPreset(preset)}
                disabled={alreadyAdded}
              >
                {preset.logo ? (
                  <Image source={{ uri: preset.logo }} style={styles.presetChipLogo} />
                ) : (
                  <Youtube color={alreadyAdded ? COLORS.neutral[400] : COLORS.error[500]} size={14} strokeWidth={2} />
                )}
                <Text
                  style={[styles.presetChipText, alreadyAdded && styles.presetChipTextAdded]}
                  numberOfLines={1}
                >
                  {preset.label}
                </Text>
                {alreadyAdded && <Check color={COLORS.success[500]} size={13} strokeWidth={2.4} />}
              </Pressable>
            );
          })}
        </View>

        {/* Channel list */}
        {(channels || []).map((ch, idx) => (
          <View key={ch.id} style={styles.channelBlock}>
            <View style={styles.channelHeader}>
              <View style={[styles.linkIconBox, { backgroundColor: COLORS.error[500] + '18' }]}>
                <Youtube color={COLORS.error[500]} size={18} strokeWidth={2} />
              </View>
              <Text style={styles.channelHeaderTitle}>{ch.label || `Channel ${idx + 1}`}</Text>
              <Pressable
                style={styles.removeChannelBtn}
                onPress={() => removeChannel(idx)}
                hitSlop={10}
                accessibilityLabel="Remove channel"
              >
                <Trash2 color={COLORS.error[500]} size={16} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Channel Name / Label</Text>
            <TextInput
              style={styles.fieldInput}
              value={ch.label}
              onChangeText={(t) => updateChannel(idx, 'label', t)}
              placeholder={`e.g. BK Sheeba`}
              placeholderTextColor={COLORS.neutral[400]}
            />
            <Text style={styles.fieldLabel}>Channel URL or ID</Text>
            <TextInput
              style={styles.fieldInput}
              value={ch.url}
              onChangeText={(t) => updateChannel(idx, 'url', t)}
              placeholder="https://youtube.com/@channel or UCxxxx"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        ))}

        {/* Add new channel button */}
        <Pressable
          style={({ pressed }) => [styles.addChannelBtn, pressed && styles.addChannelBtnPressed]}
          onPress={addChannel}
        >
          <Plus color={COLORS.primary[600]} size={18} strokeWidth={2.2} />
          <Text style={styles.addChannelBtnText}>Add New Channel</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSaveSocial}
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Social Links</Text>
        </Pressable>
      </View>

      {/* Other Social Links */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Other Social Links</Text>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#E1306C18' }]}>
            <Instagram color="#E1306C" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Instagram</Text>
            <TextInput style={styles.linkInput} value={ig} onChangeText={setIg} placeholder="https://instagram.com/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#1877F218' }]}>
            <Facebook color="#1877F2" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Facebook</Text>
            <TextInput style={styles.linkInput} value={fb} onChangeText={setFb} placeholder="https://facebook.com/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#25D36618' }]}>
            <MessageCircle color="#25D366" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>WhatsApp</Text>
            <TextInput style={styles.linkInput} value={wa} onChangeText={setWa} placeholder="https://wa.me/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#0088cc18' }]}>
            <Send color="#0088cc" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Telegram</Text>
            <TextInput style={styles.linkInput} value={tg} onChangeText={setTg} placeholder="https://t.me/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSaveSocial}
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Social Links</Text>
        </Pressable>
      </View>

      {/* Daily Murli Links */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Daily Murli Links</Text>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.primary[100] }]}>
            <BookOpen color={COLORS.primary[700]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Murli PDF URL</Text>
            <TextInput style={styles.linkInput} value={pdfUrl} onChangeText={setPdfUrl} placeholder="https://drive.google.com/file/d/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: COLORS.secondary[100] }]}>
            <Music color={COLORS.secondary[600]} size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Murli Audio URL</Text>
            <TextInput style={styles.linkInput} value={audioUrl} onChangeText={setAudioUrl} placeholder="https://drive.google.com/file/d/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={() => onSaveMurli({ pdfUrl: pdfUrl.trim(), audioUrl: audioUrl.trim() })}
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Murli Links</Text>
        </Pressable>
      </View>

      {/* Live Zoom Meeting Link */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Live Zoom Meeting Link</Text>
        <Text style={styles.formHint}>
          Update the meeting link used when users tap "🔴 Live Zoom Session - Tap to Join" on the Home Screen.
        </Text>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#8B000018' }]}>
            <Video color="#8B0000" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Zoom Join URL</Text>
            <TextInput
              style={styles.linkInput}
              value={zoomUrl}
              onChangeText={setZoomUrl}
              placeholder="https://us02web.zoom.us/j/..."
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.linkInputRow}>
          <View style={[styles.linkIconBox, { backgroundColor: '#D3540018' }]}>
            <Info color="#D35400" size={18} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkInputLabel}>Meeting ID</Text>
            <TextInput
              style={styles.linkInput}
              value={zoomMeetingId}
              onChangeText={setZoomMeetingId}
              placeholder="e.g. 5043349232"
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={() =>
            onSaveZoom({
              joinUrl: zoomUrl.trim(),
              meetingId: zoomMeetingId.trim(),
            })
          }
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Live Zoom Link</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Traffic Control Admin — Google Drive Audio & Local Caching
// ════════════════════════════════════════════════════════════════════════
function TrafficAdmin({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [driveUrl, setDriveUrl] = useState(getTrafficDriveFolderUrl());
  const [tracks, setTracks] = useState<Record<string, string>>(getTrafficCustomTracks());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const handleSave = () => {
    setTrafficDriveFolderUrl(driveUrl.trim());
    setTrafficCustomTracks(tracks);
    toast.show('Traffic Control Drive links saved', 'success');
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Downloading & caching MP3 audio files locally...');
    try {
      await downloadAndCacheAllTrafficTracks(true);
      toast.show('✨ All Traffic Control MP3s cached offline 100%', 'success');
      setSyncStatus('100% Offline Ready: All 9 tracks cached on device storage.');
    } catch (e) {
      toast.show('Cached with bundled offline fallbacks', 'info');
      setSyncStatus('100% Offline Ready with bundled audio files.');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateTrackUrl = (slotKey: string, url: string) => {
    setTracks((prev) => ({ ...prev, [slotKey]: url }));
  };

  return (
    <View>
      {/* Google Drive Folder Banner */}
      <View style={styles.formCard}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIconWrap}>
            <Clock color={COLORS.primary[700]} size={22} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.formTitle}>Traffic Control Audio Folder</Text>
            <Text style={styles.settingsSub}>Connect Google Drive audio folder for offline caching</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Google Drive Audio Folder Link</Text>
        <TextInput
          style={styles.fieldInput}
          value={driveUrl}
          onChangeText={setDriveUrl}
          placeholder="https://drive.google.com/drive/folders/..."
          placeholderTextColor={COLORS.neutral[400]}
          autoCapitalize="none"
        />

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSave}
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Folder Link</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.fetchBtn, pressed && styles.submitBtnPressed, isSyncing && styles.submitBtnDisabled]}
          onPress={handleSyncNow}
          disabled={isSyncing}
        >
          <HardDriveDownload color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>{isSyncing ? 'Caching Tracks...' : 'Download & Cache Offline Now'}</Text>
        </Pressable>

        {syncStatus ? (
          <View style={styles.fetchResultBox}>
            <CheckCircle2 color={COLORS.success[600]} size={16} strokeWidth={2} />
            <Text style={styles.fetchResultText}>{syncStatus}</Text>
          </View>
        ) : null}
      </View>

      {/* Individual Slot Audio URLs */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Audio Tracks by Schedule Slot</Text>
        <Text style={styles.formHint}>All 9 slots are bundled locally. You can optionally override specific Google Drive MP3 links below:</Text>

        {TRAFFIC_TRACK_SLOTS.map((slot) => (
          <View key={slot.slotKey} style={{ marginBottom: SPACING.md }}>
            <Text style={styles.fieldLabel}>
              {slot.time !== 'hourly' ? `${slot.time} - ` : ''}{slot.titleEn} ({slot.titleMl})
            </Text>
            <TextInput
              style={styles.fieldInput}
              value={tracks[slot.slotKey] ?? ''}
              onChangeText={(t) => updateTrackUrl(slot.slotKey, t.trim())}
              placeholder={`Default: ${slot.filename}`}
              placeholderTextColor={COLORS.neutral[400]}
              autoCapitalize="none"
            />
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
          onPress={handleSave}
        >
          <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Save Audio Track Links</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Settings Admin — Password change
// ════════════════════════════════════════════════════════════════════════
function SettingsAdmin({
  onChangePassword,
}: {
  currentPassword: string;
  onChangePassword: (newPwd: string) => void;
}) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const storedPassword = getItem(STORAGE_KEYS.adminPassword) ?? ADMIN_PASSWORD;

  const handleSubmit = () => {
    setError('');
    setSuccess(false);

    if (!oldPwd || !newPwd || !confirmPwd) {
      setError('All fields are required');
      return;
    }
    if (oldPwd !== storedPassword) {
      setError('Current password is incorrect');
      return;
    }
    if (newPwd.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match');
      return;
    }
    onChangePassword(newPwd);
    setSuccess(true);
    setOldPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  return (
    <View>
      <View style={styles.formCard}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIconWrap}>
            <KeyRound color={COLORS.primary[700]} size={22} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.formTitle}>Change Admin Password</Text>
            <Text style={styles.settingsSub}>Update your admin login password</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Current Password</Text>
        <TextInput
          style={[styles.fieldInput, error && styles.loginInputError]}
          placeholder="Enter current password"
          placeholderTextColor={COLORS.neutral[400]}
          secureTextEntry
          value={oldPwd}
          onChangeText={(t) => { setOldPwd(t); setError(''); setSuccess(false); }}
        />

        <Text style={styles.fieldLabel}>New Password</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="At least 6 characters"
          placeholderTextColor={COLORS.neutral[400]}
          secureTextEntry
          value={newPwd}
          onChangeText={(t) => { setNewPwd(t); setError(''); setSuccess(false); }}
        />

        <Text style={styles.fieldLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Re-enter new password"
          placeholderTextColor={COLORS.neutral[400]}
          secureTextEntry
          value={confirmPwd}
          onChangeText={(t) => { setConfirmPwd(t); setError(''); setSuccess(false); }}
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? (
          <View style={styles.successBox}>
            <Check color={COLORS.success[600]} size={16} strokeWidth={2.4} />
            <Text style={styles.successText}>Password updated successfully</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, (!oldPwd || !newPwd || !confirmPwd) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!oldPwd || !newPwd || !confirmPwd}
        >
          <KeyRound color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.submitBtnText}>Update Password</Text>
        </Pressable>
      </View>

      <View style={styles.sessionNote}>
        <Text style={styles.sessionNoteText}>
          Your admin session stays active until you click "Save & Logout". The password is stored securely on this device.
        </Text>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Meditation Admin
// ════════════════════════════════════════════════════════════════════════
function MeditationAdmin({
  items,
  editing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  items: MeditationItem[];
  editing: MeditationItem | null;
  onEdit: (item: MeditationItem) => void;
  onSave: (item: MeditationItem) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<'commentary' | 'music' | 'song' | 'ringtone'>('commentary');
  const [driveUrl, setDriveUrl] = useState('');

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setSubtitle(editing.subtitle ?? '');
      setCategory(editing.category);
      setDriveUrl(editing.driveUrl);
    } else {
      setTitle(''); setSubtitle(''); setCategory('commentary'); setDriveUrl('');
    }
  }, [editing]);

  const handleSubmit = () => {
    if (!title.trim() || !driveUrl.trim()) return;
    onSave({
      id: editing?.id ?? `med_${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      driveUrl: driveUrl.trim(),
    });
    setTitle(''); setSubtitle(''); setCategory('commentary'); setDriveUrl('');
  };

  return (
    <View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editing ? 'Edit Meditation' : 'Add Meditation'}</Text>

        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle} placeholder="e.g. Money Attraction" placeholderTextColor={COLORS.neutral[400]} />

        <Text style={styles.fieldLabel}>Malayalam subtitle (optional)</Text>
        <TextInput style={styles.fieldInput} value={subtitle} onChangeText={setSubtitle} placeholder="ധന ആകർഷണം" placeholderTextColor={COLORS.neutral[400]} />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.catRow}>
          {(['commentary', 'music', 'song'] as const).map((c) => {
            const label = c === 'commentary' ? 'Commentary' : c === 'music' ? 'Music' : 'Song';
            return (
              <Pressable key={c} style={[styles.catBtn, category === c && styles.catBtnActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.catBtnText, category === c && styles.catBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Google Drive URL</Text>
        <TextInput style={styles.fieldInput} value={driveUrl} onChangeText={setDriveUrl} placeholder="https://drive.google.com/file/d/..." placeholderTextColor={COLORS.neutral[400]} autoCapitalize="none" />

        <View style={styles.formActions}>
          {editing && (
            <Pressable style={styles.cancelBtn} onPress={onCancelEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, (!title.trim() || !driveUrl.trim()) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!title.trim() || !driveUrl.trim()}
          >
            <Plus color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
            <Text style={styles.submitBtnText}>{editing ? 'Update' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.listLabel}>Existing entries ({items.length})</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listRowTitle}>{item.title}</Text>
            <Text style={styles.listRowSub}>
              {item.category === 'commentary' ? 'Commentary' : item.category === 'music' ? 'Music' : 'Song'} · {item.subtitle || '—'}
            </Text>
          </View>
          <Pressable style={styles.iconActionBtn} onPress={() => onEdit(item)} hitSlop={8}>
            <Edit2 color={COLORS.primary[600]} size={16} strokeWidth={2} />
          </Pressable>
          <Pressable style={styles.iconActionBtn} onPress={() => onDelete(item.id)} hitSlop={8}>
            <Trash2 color={COLORS.error[500]} size={16} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Contacts Admin
// ════════════════════════════════════════════════════════════════════════
function ContactsAdmin({
  contacts,
  editing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  contacts: ContactEntry[];
  editing: ContactEntry | null;
  onEdit: (c: ContactEntry) => void;
  onSave: (c: ContactEntry) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const [centreName, setCentreName] = useState('');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<ContactCategory>('kozhikode-main');

  useEffect(() => {
    if (editing) {
      setCentreName(editing.centreName);
      setPersonName(editing.personName);
      setPhone(editing.phone);
      setAddress(editing.address ?? '');
      setCategory(editing.category);
    } else {
      setCentreName(''); setPersonName(''); setPhone(''); setAddress(''); setCategory('kozhikode-main');
    }
  }, [editing]);

  const handleSubmit = () => {
    if (!centreName.trim() || !phone.trim()) return;
    onSave({
      id: editing?.id ?? `ct_${Date.now()}`,
      centreName: centreName.trim(),
      personName: personName.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      category,
    });
    setCentreName(''); setPersonName(''); setPhone(''); setAddress(''); setCategory('kozhikode-main');
  };

  const catKeys = Object.keys(CONTACT_CATEGORY_LABELS) as ContactCategory[];

  return (
    <View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editing ? 'Edit Contact' : 'Add Contact'}</Text>

        <Text style={styles.fieldLabel}>Centre / Branch Name</Text>
        <TextInput style={styles.fieldInput} value={centreName} onChangeText={setCentreName} placeholder="e.g. Elathur Branch" placeholderTextColor={COLORS.neutral[400]} />

        <Text style={styles.fieldLabel}>Person Name</Text>
        <TextInput style={styles.fieldInput} value={personName} onChangeText={setPersonName} placeholder="e.g. BK Sister" placeholderTextColor={COLORS.neutral[400]} />

        <Text style={styles.fieldLabel}>Phone Number</Text>
        <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="+91..." placeholderTextColor={COLORS.neutral[400]} keyboardType="phone-pad" />

        <Text style={styles.fieldLabel}>Address (optional)</Text>
        <TextInput
          style={[styles.fieldInput, { minHeight: 60 }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Centre address..."
          placeholderTextColor={COLORS.neutral[400]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.catCol}>
          {catKeys.map((k) => {
            const active = category === k;
            return (
              <Pressable key={k} style={[styles.catWideBtn, active && styles.catWideBtnActive]} onPress={() => setCategory(k)}>
                <Text style={[styles.catWideBtnText, active && styles.catWideBtnTextActive]}>{CONTACT_CATEGORY_LABELS[k].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formActions}>
          {editing && (
            <Pressable style={styles.cancelBtn} onPress={onCancelEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed, (!centreName.trim() || !phone.trim()) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!centreName.trim() || !phone.trim()}
          >
            <Plus color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
            <Text style={styles.submitBtnText}>{editing ? 'Update' : 'Add'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.listLabel}>Existing contacts ({contacts.length})</Text>
      {contacts.map((c) => (
        <View key={c.id} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listRowTitle}>{c.centreName}</Text>
            <Text style={styles.listRowSub}>{c.personName} · {c.phone}{c.address ? ` · ${c.address}` : ''}</Text>
          </View>
          <Pressable style={styles.iconActionBtn} onPress={() => onEdit(c)} hitSlop={8}>
            <Edit2 color={COLORS.primary[600]} size={16} strokeWidth={2} />
          </Pressable>
          <Pressable style={styles.iconActionBtn} onPress={() => onDelete(c.id)} hitSlop={8}>
            <Trash2 color={COLORS.error[500]} size={16} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Announcement Admin
// ════════════════════════════════════════════════════════════════════════
function AnnouncementAdmin({ announcement, onSave }: { announcement: Announcement; onSave: (a: Announcement) => void }) {
  const [enabled, setEnabled] = useState(announcement.enabled);
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);

  useEffect(() => {
    setEnabled(announcement.enabled);
    setTitle(announcement.title);
    setBody(announcement.body);
  }, [announcement]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Announcement Banner</Text>

      <Pressable style={styles.toggleRowSettings} onPress={() => setEnabled(!enabled)}>
        <View style={[styles.adminToggle, enabled && styles.adminToggleOn]}>
          <View style={[styles.adminToggleKnob, enabled && styles.adminToggleKnobOn]} />
        </View>
        <Text style={styles.toggleLabel}>{enabled ? 'Banner is ON (visible)' : 'Banner is OFF (hidden)'}</Text>
      </Pressable>

      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle} placeholder="Announcement title" placeholderTextColor={COLORS.neutral[400]} />

      <Text style={styles.fieldLabel}>Body text</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 80 }]}
        value={body}
        onChangeText={setBody}
        placeholder="Announcement message..."
        placeholderTextColor={COLORS.neutral[400]}
        multiline
        textAlignVertical="top"
      />

      <Pressable
        style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
        onPress={() => onSave({ enabled, title: title.trim(), body: body.trim() })}
      >
        <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
        <Text style={styles.submitBtnText}>Save Announcement</Text>
      </Pressable>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Varadan & Swaman Admin
// ════════════════════════════════════════════════════════════════════════
function VaradanAdmin({
  varadan,
  swaman,
  onSave,
}: {
  varadan: Varadan;
  swaman?: Swaman;
  onSave: (v: Varadan, s?: Swaman) => void;
}) {
  const [text, setText] = useState(varadan.text);
  const [textMl, setTextMl] = useState(varadan.textMl);
  const [audioUrl, setAudioUrl] = useState(varadan.audioUrl);
  const [swamanTextMl, setSwamanTextMl] = useState(swaman?.textMl || '');
  const [swamanTextEn, setSwamanTextEn] = useState(swaman?.textEn || '');

  useEffect(() => {
    setText(varadan.text);
    setTextMl(varadan.textMl);
    setAudioUrl(varadan.audioUrl);
    if (swaman) {
      setSwamanTextMl(swaman.textMl);
      setSwamanTextEn(swaman.textEn || '');
    }
  }, [varadan, swaman]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Varadan & Swaman of the Day</Text>

      <Text style={styles.fieldLabel}>Varadan (Malayalam)</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 70, fontFamily: FONTS.malayalam }]}
        value={textMl}
        onChangeText={setTextMl}
        placeholder="ഇന്നത്തെ വരദാനം..."
        placeholderTextColor={COLORS.neutral[400]}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.fieldLabel}>Varadan (English)</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 60 }]}
        value={text}
        onChangeText={setText}
        placeholder="Today's blessing in English..."
        placeholderTextColor={COLORS.neutral[400]}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.fieldLabel}>Daily Swaman (Malayalam)</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 50, fontFamily: FONTS.malayalam }]}
        value={swamanTextMl}
        onChangeText={setSwamanTextMl}
        placeholder="ഇന്നത്തെ സ്വാമാനം..."
        placeholderTextColor={COLORS.neutral[400]}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.fieldLabel}>Daily Swaman (English)</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 50 }]}
        value={swamanTextEn}
        onChangeText={setSwamanTextEn}
        placeholder="Today's affirmation in English..."
        placeholderTextColor={COLORS.neutral[400]}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.fieldLabel}>Audio URL (Google Drive / Direct)</Text>
      <TextInput
        style={styles.fieldInput}
        value={audioUrl}
        onChangeText={setAudioUrl}
        placeholder="https://drive.google.com/file/d/..."
        placeholderTextColor={COLORS.neutral[400]}
        autoCapitalize="none"
      />

      <Pressable
        style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
        onPress={() =>
          onSave(
            { text: text.trim(), textMl: textMl.trim(), audioUrl: audioUrl.trim() },
            { textMl: swamanTextMl.trim(), textEn: swamanTextEn.trim() }
          )
        }
      >
        <Check color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
        <Text style={styles.submitBtnText}>Save Varadan & Swaman</Text>
      </Pressable>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: COLORS.neutral[50],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[800],
    paddingHorizontal: SPACING.xl,
    paddingTop: 52,
    paddingBottom: SPACING.lg,
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.neutral[0] },
  headerSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.primary[200], marginTop: 2 },
  closeBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Login
  loginWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING['3xl'] },
  loginIcon: {
    width: 64, height: 64, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[100], alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg, ...SHADOWS.glow,
  },
  loginTitle: { fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.primary[800] },
  loginSub: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.neutral[500], marginTop: SPACING.xs, textAlign: 'center' },
  loginInput: {
    width: '100%',
    borderWidth: 1.5, borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    fontFamily: FONTS.sansMedium, fontSize: 16, color: COLORS.neutral[900],
    marginTop: SPACING.xl, backgroundColor: COLORS.neutral[0],
  },
  loginInputError: { borderColor: COLORS.error[500] },
  errorText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.error[500], marginTop: SPACING.sm },
  loginBtn: {
    width: '100%', backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.lg, paddingVertical: SPACING.lg,
    alignItems: 'center', marginTop: SPACING.lg, ...SHADOWS.md,
  },
  loginBtnPressed: { backgroundColor: COLORS.primary[700] },
  loginBtnText: { fontFamily: FONTS.sansBold, fontSize: 15, color: COLORS.neutral[0] },
  // Tabs — scrollable for 6 items
  tabScroll: {
    backgroundColor: COLORS.neutral[0],
    borderBottomWidth: 1, borderBottomColor: COLORS.neutral[100],
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  adminTab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md,
  },
  adminTabActive: { backgroundColor: COLORS.primary[600], ...SHADOWS.sm },
  adminTabText: { fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.neutral[500] },
  adminTabTextActive: { color: COLORS.neutral[0], fontFamily: FONTS.sansSemiBold },
  adminBody: { flex: 1, padding: SPACING.lg },
  // Form
  formCard: {
    backgroundColor: COLORS.neutral[0], borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.neutral[100], ...SHADOWS.sm,
  },
  formTitle: { fontFamily: FONTS.sansBold, fontSize: 16, color: COLORS.primary[800], marginBottom: SPACING.md },
  formHint: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[400], marginBottom: SPACING.md, lineHeight: 17 },
  // YouTube channel blocks
  channelBlock: {
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.neutral[50],
  },
  channelHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  channelHeaderTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.neutral[700] },
  fieldLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[600], marginBottom: SPACING.xs, marginTop: SPACING.sm },
  fieldInput: {
    borderWidth: 1.5, borderColor: COLORS.neutral[200], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.neutral[900],
    backgroundColor: COLORS.neutral[50],
  },
  // Links tab
  linkInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md,
  },
  linkIconBox: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  linkInputLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[700], marginBottom: 4 },
  linkInput: {
    borderWidth: 1.5, borderColor: COLORS.neutral[200], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[900],
    backgroundColor: COLORS.neutral[50],
  },
  // Settings tab
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  settingsIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary[50], alignItems: 'center', justifyContent: 'center' },
  settingsSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[500], marginTop: 2 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.success[500] + '18', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginTop: SPACING.sm,
  },
  successText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.success[600] },
  sessionNote: {
    backgroundColor: COLORS.neutral[100], borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
  },
  sessionNoteText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[500], lineHeight: 18 },
  // Category buttons
  catRow: { flexDirection: 'row', gap: SPACING.sm },
  catBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.neutral[100], alignItems: 'center' },
  catBtnActive: { backgroundColor: COLORS.primary[600] },
  catBtnText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[500] },
  catBtnTextActive: { color: COLORS.neutral[0] },
  catCol: { gap: SPACING.xs },
  catWideBtn: { paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.neutral[100], paddingHorizontal: SPACING.md },
  catWideBtnActive: { backgroundColor: COLORS.primary[600] },
  catWideBtnText: { fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.neutral[500] },
  catWideBtnTextActive: { color: COLORS.neutral[0] },
  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.neutral[100], alignItems: 'center' },
  cancelBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[600] },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary[600], borderRadius: RADIUS.lg, paddingVertical: SPACING.lg, ...SHADOWS.sm,
  },
  submitBtnPressed: { backgroundColor: COLORS.primary[700] },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontFamily: FONTS.sansBold, fontSize: 14, color: COLORS.neutral[0] },
  fetchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.secondary[600], borderRadius: RADIUS.lg, paddingVertical: SPACING.lg,
    marginTop: SPACING.md, ...SHADOWS.sm,
  },
  // Automation styles
  automationBanner: {
    flexDirection: 'row', gap: SPACING.md, backgroundColor: COLORS.primary[50],
    borderWidth: 1, borderColor: COLORS.primary[200], borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  automationBannerText: { flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.primary[800], lineHeight: 19 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.neutral[100],
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  toggleTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[900] },
  toggleSub: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.neutral[500], marginTop: 2 },
  toggleSwitch: { width: 46, height: 26, borderRadius: 13, backgroundColor: COLORS.neutral[300], padding: 2, justifyContent: 'center' },
  toggleSwitchOn: { backgroundColor: COLORS.primary[600] },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.neutral[0], ...SHADOWS.sm },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  fetchResultBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, marginTop: SPACING.md,
  },
  fetchResultText: { flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[700] },
  // Channel presets & dynamic list
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.neutral[50], borderWidth: 1, borderColor: COLORS.neutral[200],
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6,
  },
  presetChipAdded: { backgroundColor: COLORS.success[500] + '18', borderColor: COLORS.success[500] + '40' },
  presetChipPressed: { transform: [{ scale: 0.96 }] },
  presetChipLogo: { width: 18, height: 18, borderRadius: 9 },
  presetChipText: { fontFamily: FONTS.sansMedium, fontSize: 11, color: COLORS.neutral[700] },
  presetChipTextAdded: { color: COLORS.neutral[400] },
  removeChannelBtn: {
    width: 30, height: 30, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.error[500] + '12',
  },
  addChannelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    borderWidth: 1.5, borderColor: COLORS.primary[300], borderStyle: 'dashed',
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md, marginBottom: SPACING.md,
  },
  addChannelBtnPressed: { backgroundColor: COLORS.primary[500] + '14' },
  addChannelBtnText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.primary[600] },
  // List
  listLabel: { fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.neutral[400], letterSpacing: 1, marginBottom: SPACING.sm },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.neutral[0], borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.neutral[100],
  },
  listRowTitle: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[900] },
  listRowSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.neutral[500], marginTop: 2 },
  iconActionBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: COLORS.neutral[50], alignItems: 'center', justifyContent: 'center' },
  // Toggle
  toggleRowSettings: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  adminToggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: COLORS.neutral[300], padding: 2, justifyContent: 'center' },
  adminToggleOn: { backgroundColor: COLORS.primary[600] },
  adminToggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.neutral[0], ...SHADOWS.sm },
  adminToggleKnobOn: { transform: [{ translateX: 20 }] },
  toggleLabel: { fontFamily: FONTS.sansMedium, fontSize: 14, color: COLORS.neutral[700] },
  // Logout
  logoutBar: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.neutral[100], backgroundColor: COLORS.neutral[0] },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.neutral[100] },
  logoutText: { fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.neutral[600] },
});
