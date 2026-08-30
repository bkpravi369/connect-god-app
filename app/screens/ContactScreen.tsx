import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Phone, MapPin, ChevronDown, ChevronRight, X, Building2 } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/lib/theme';
import {
  ContactEntry,
  ContactCategory,
  DEFAULT_CONTACTS,
  CONTACT_CATEGORY_LABELS,
  STORAGE_KEYS,
} from '@/lib/constants';
import { getJSON } from '@/lib/storage';
import { useToast } from '@/components/ToastProvider';

const KERALA_14_HQ = [
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

export default function ContactScreen() {
  const toast = useToast();
  const [contacts, setContacts] = useState<ContactEntry[]>(DEFAULT_CONTACTS);
  const [kzhBranchOpen, setKzhBranchOpen] = useState(false);
  const [wynBranchOpen, setWynBranchOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);

  useEffect(() => {
    const stored = getJSON<ContactEntry[]>(STORAGE_KEYS.contacts, DEFAULT_CONTACTS);
    setContacts(stored);
  }, []);

  const handleCall = useCallback(async (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${cleanPhone}`;
    const ok = await Linking.canOpenURL(telUrl).catch(() => false);
    if (ok) {
      await Linking.openURL(telUrl);
    } else {
      Linking.openURL(telUrl).catch(() => {
        toast.show(`Phone: ${phone}`, 'info');
      });
    }
  }, [toast]);

  const kzhMain = contacts.filter((c) => c.category === 'kozhikode-main');
  const kzhBranches = contacts.filter((c) => c.category === 'kozhikode-branches');
  const wynMain = contacts.filter((c) => c.category === 'wayanad-main');
  const wynBranches = contacts.filter((c) => c.category === 'wayanad-branches');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Phone color={COLORS.neutral[0]} size={22} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Contact Us</Text>
            <Text style={styles.headerSub}>ബന്ധപ്പെടുക</Text>
          </View>
        </View>

        {/* Kozhikode District */}
        <Text style={styles.districtHeading}>Kozhikode District</Text>
        {kzhMain.map((c) => (
          <MainCentreCard key={c.id} entry={c} onCall={handleCall} />
        ))}
        {kzhBranches.length > 0 && (
          <BranchDropdown
            label="Kozhikode Branches"
            subLabel="കോഴിക്കോട് ശാഖകൾ"
            open={kzhBranchOpen}
            onToggle={() => setKzhBranchOpen((v) => !v)}
            entries={kzhBranches}
            onCall={handleCall}
          />
        )}

        {/* Wayanad District */}
        <Text style={styles.districtHeading}>Wayanad District</Text>
        {wynMain.map((c) => (
          <MainCentreCard key={c.id} entry={c} onCall={handleCall} />
        ))}
        {wynBranches.length > 0 && (
          <BranchDropdown
            label="Wayanad Branches"
            subLabel="വയനാട് ശാഖകൾ"
            open={wynBranchOpen}
            onToggle={() => setWynBranchOpen((v) => !v)}
            entries={wynBranches}
            onCall={handleCall}
          />
        )}

        {/* B.K District HeadQuarters Kerala */}
        <Pressable
          style={({ pressed }) => [styles.otherCard, pressed && styles.otherCardPressed]}
          onPress={() => setOtherOpen((v) => !v)}
          accessibilityLabel="B.K District HeadQuarters Kerala (14 Districts)"
        >
          <View style={styles.otherIconWrap}>
            <Building2 color={COLORS.primary[700]} size={20} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.otherLabel}>B.K District HeadQuarters Kerala</Text>
            <Text style={styles.otherSub}>ജില്ലാ ആസ്ഥാന കേന്ദ്രങ്ങൾ</Text>
          </View>
          <View style={styles.hqBadgeCount}>
            <Text style={styles.hqBadgeCountText}>14</Text>
          </View>
          <ChevronDown
            color={COLORS.neutral[400]}
            size={20}
            strokeWidth={2.2}
            style={{ transform: [{ rotate: otherOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {otherOpen && (
          <View style={styles.otherList}>
            {KERALA_14_HQ.map((item) => (
              <DistrictHQRow key={item.district} item={item} onCall={handleCall} />
            ))}
          </View>
        )}

        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>
    </View>
  );
}

function MainCentreCard({ entry, onCall }: { entry: ContactEntry; onCall: (p: string) => void }) {
  return (
    <View style={styles.mainCard}>
      <View style={styles.mainHeader}>
        <View style={styles.mainBadge}>
          <MapPin color={COLORS.neutral[0]} size={13} strokeWidth={2.4} />
          <Text style={styles.mainBadgeText}>Main Centre</Text>
        </View>
        <Text style={styles.mainCentreName}>{entry.centreName}</Text>
      </View>
      <View style={styles.mainBody}>
        {entry.personName && entry.personName !== entry.centreName && (
          <Text style={styles.mainPerson}>{entry.personName}</Text>
        )}
        {entry.address && (
          <View style={styles.addressRow}>
            <MapPin color={COLORS.primary[600]} size={15} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={styles.mainAddress}>{entry.address}</Text>
          </View>
        )}
        <Text style={styles.mainPhone}>
          {entry.phone}
          {entry.secondaryPhone ? ` / ${entry.secondaryPhone}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <Pressable
          style={({ pressed }) => [styles.callBtn, { flex: 1 }, pressed && styles.callBtnPressed]}
          onPress={() => onCall(entry.phone)}
        >
          <Phone color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
          <Text style={styles.callBtnText}>Call</Text>
        </Pressable>
        {entry.secondaryPhone && (
          <Pressable
            style={({ pressed }) => [
              styles.callBtn,
              { flex: 1, backgroundColor: COLORS.primary[600] },
              pressed && styles.callBtnPressed,
            ]}
            onPress={() => onCall(entry.secondaryPhone!)}
          >
            <Phone color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
            <Text style={styles.callBtnText}>Call (2)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function BranchDropdown({
  label,
  subLabel,
  open,
  onToggle,
  entries,
  onCall,
}: {
  label: string;
  subLabel: string;
  open: boolean;
  onToggle: () => void;
  entries: ContactEntry[];
  onCall: (p: string) => void;
}) {
  return (
    <View style={styles.branchCard}>
      <Pressable
        style={({ pressed }) => [styles.branchHeader, pressed && styles.branchHeaderPressed]}
        onPress={onToggle}
      >
        <View style={styles.branchIconWrap}>
          <ChevronRight
            color={COLORS.primary[600]}
            size={18}
            strokeWidth={2.2}
            style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchLabel}>{label}</Text>
          <Text style={styles.branchSub}>{subLabel}</Text>
        </View>
        <Text style={styles.branchCount}>{entries.length}</Text>
      </Pressable>
      {open && (
        <View style={styles.branchList}>
          {entries.map((c) => (
            <ContactRow key={c.id} entry={c} onCall={onCall} />
          ))}
        </View>
      )}
    </View>
  );
}

function ContactRow({ entry, onCall }: { entry: ContactEntry; onCall: (p: string) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
      onPress={() => onCall(entry.phone)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.contactCentre}>{entry.centreName}</Text>
        {entry.personName && entry.personName !== entry.centreName && (
          <Text style={styles.contactPerson}>{entry.personName}</Text>
        )}
        {entry.address && <Text style={styles.contactAddress}>{entry.address}</Text>}
        <Text style={styles.contactPhone}>
          {entry.phone}
          {entry.secondaryPhone ? ` / ${entry.secondaryPhone}` : ''}
        </Text>
      </View>
      <View style={styles.rowCallBtn}>
        <Phone color={COLORS.neutral[0]} size={16} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

function DistrictHQRow({
  item,
  onCall,
}: {
  item: { district: string; phones: string[] };
  onCall: (p: string) => void;
}) {
  return (
    <View style={styles.hqCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactCentre}>{item.district}</Text>
        <View style={styles.hqPhoneList}>
          {item.phones.map((phone, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.hqPhoneChip, pressed && styles.hqPhoneChipPressed]}
              onPress={() => onCall(phone)}
            >
              <Phone color={COLORS.primary[600]} size={13} strokeWidth={2.2} />
              <Text style={styles.hqPhoneChipText}>{phone}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
        {item.phones.map((phone, idx) => (
          <Pressable
            key={idx}
            style={({ pressed }) => [styles.hqCallBtn, pressed && styles.hqCallBtnPressed]}
            onPress={() => onCall(phone)}
          >
            <Phone color={COLORS.neutral[0]} size={15} strokeWidth={2.4} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  content: { padding: SPACING.lg },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary[800],
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: FONTS.sansBold, fontSize: 18, color: COLORS.neutral[0] },
  headerSub: { fontFamily: FONTS.malayalam, fontSize: 13.5, color: COLORS.primary[200], marginTop: 2 },

  // District heading
  districtHeading: {
    fontFamily: FONTS.sansBold,
    fontSize: 16.5,
    color: COLORS.primary[800],
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },

  // Main centre card
  mainCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
    ...SHADOWS.md,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  mainBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    color: COLORS.neutral[0],
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  mainCentreName: {
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    lineHeight: 24,
    color: COLORS.neutral[900],
    flex: 1,
    letterSpacing: 0.2,
  },
  mainBody: {
    gap: 6,
    marginBottom: SPACING.md,
  },
  mainPerson: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.neutral[700],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 3,
  },
  mainAddress: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.neutral[600],
    flex: 1,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  mainPhone: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.primary[700],
    marginTop: 3,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: COLORS.primary[600],
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  callBtnPressed: { backgroundColor: COLORS.primary[700] },
  callBtnText: { fontFamily: FONTS.sansBold, fontSize: 14.5, color: COLORS.neutral[0] },

  // Branch dropdown
  branchCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  branchHeaderPressed: { backgroundColor: COLORS.primary[50] },
  branchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15.5,
    color: COLORS.neutral[900],
  },
  branchSub: {
    fontFamily: FONTS.malayalam,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  branchCount: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.primary[600],
  },
  branchList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm + 2,
  },

  // Other districts / District HQ
  otherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.secondary[100],
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.secondary[300],
  },
  otherCardPressed: { backgroundColor: COLORS.secondary[200] },
  otherIconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15.5,
    color: COLORS.neutral[900],
  },
  otherSub: {
    fontFamily: FONTS.malayalam,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.neutral[500],
    marginTop: 2,
  },
  hqBadgeCount: {
    backgroundColor: COLORS.secondary[300],
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginRight: 4,
  },
  hqBadgeCountText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
    color: COLORS.secondary[800],
  },
  otherList: {
    gap: SPACING.sm + 2,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    color: COLORS.neutral[400],
    paddingVertical: SPACING.md,
    textAlign: 'center',
  },

  // District HQ Row
  hqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md + 2,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  hqPhoneList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginTop: 5,
  },
  hqPhoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  hqPhoneChipPressed: { backgroundColor: COLORS.primary[100] },
  hqPhoneChipText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: COLORS.primary[700],
  },
  hqCallBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  hqCallBtnPressed: { backgroundColor: COLORS.primary[700] },

  // Contact row (shared)
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md + 2,
    borderWidth: 1,
    borderColor: COLORS.neutral[100],
  },
  contactRowPressed: { backgroundColor: COLORS.primary[50] },
  contactCentre: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15.5,
    lineHeight: 22,
    color: COLORS.neutral[900],
    letterSpacing: 0.2,
  },
  contactPerson: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.neutral[700],
    marginTop: 2,
  },
  contactAddress: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 21,
    color: COLORS.neutral[500],
    marginTop: 3,
    letterSpacing: 0.15,
  },
  contactPhone: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.primary[700],
    marginTop: 4,
  },
  rowCallBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
});

export { ContactScreen };
