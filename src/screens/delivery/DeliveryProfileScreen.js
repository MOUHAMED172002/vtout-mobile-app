import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getDeliveryProfile, registerLivreur, updateServiceZones } from '../../services/deliveryOrderService';
import { getCommunesParDepartement } from '../../utils/communes';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const VEHICLE_TYPES = [
  { key: 'moto', label: 'Moto', icon: 'bicycle' },
  { key: 'bicycle', label: 'Vélo', icon: 'bicycle-outline' },
  { key: 'car', label: 'Voiture', icon: 'car-outline' },
];
const vehicleLabel = (key) => VEHICLE_TYPES.find((v) => v.key === key)?.label || key || 'Non renseigné';

export default function DeliveryProfileScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneSaving, setZoneSaving] = useState(false);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const communesParDept = useMemo(() => getCommunesParDepartement(), []);
  const filteredDepts = useMemo(() => {
    if (!zoneSearch.trim()) return communesParDept;
    const q = zoneSearch.toLowerCase();
    return communesParDept
      .map((d) => ({ ...d, communes: (d.communes || []).filter((c) => c.toLowerCase().includes(q)) }))
      .filter((d) => d.communes.length > 0);
  }, [communesParDept, zoneSearch]);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const me = await getDeliveryProfile(token);
      setProfile(me);
      setVehicleType(me.vehicle_type || 'moto');
      setVehicleModel(me.vehicle_model || '');
      setLicensePlate(me.license_plate || '');
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const handleToggleZone = async (commune) => {
    const zones = profile?.service_zones || [];
    const newZones = zones.includes(commune) ? zones.filter((z) => z !== commune) : [...zones, commune];
    setProfile((p) => ({ ...p, service_zones: newZones }));
    setZoneSaving(true);
    try {
      const token = await getToken();
      await updateServiceZones(newZones, token);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour vos zones de service.');
      load();
    } finally {
      setZoneSaving(false);
    }
  };

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    try {
      const token = await getToken();
      await registerLivreur({
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        license_plate: licensePlate,
        service_zones: profile?.service_zones || [],
      }, token);
      setProfile((p) => ({ ...p, vehicle_type: vehicleType, vehicle_model: vehicleModel, license_plate: licensePlate }));
      setShowVehicleModal(false);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Impossible de mettre à jour votre véhicule.');
    } finally {
      setSavingVehicle(false);
    }
  };

  if (loading) return <Loading />;
  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Profil livreur introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {profile.kyc_status === 'rejected' && (
          <View style={styles.noticeCardDanger}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitleDanger}>Dossier KYC rejeté</Text>
              {profile.kyc_rejection_reason ? <Text style={styles.noticeSubtitleDanger}>{profile.kyc_rejection_reason}</Text> : null}
            </View>
          </View>
        )}
        {profile.kyc_status === 'submitted' && !profile.is_verified && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={20} color={colors.warning} />
            <Text style={styles.noticeSubtitle}>Votre dossier KYC est en cours d'examen par notre équipe.</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Mon véhicule</Text>
            <Pressable style={styles.editBtn} onPress={() => setShowVehicleModal(true)}>
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{vehicleLabel(profile.vehicle_type)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modèle</Text>
            <Text style={styles.infoValue}>{profile.vehicle_model || 'Non renseigné'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Immatriculation</Text>
            <Text style={styles.infoValue}>{profile.license_plate || 'Non renseigné'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Zones de service ({(profile.service_zones || []).length})</Text>
            {zoneSaving && <Ionicons name="sync" size={14} color={colors.textFaint} />}
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={15} color={colors.textFaint} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une commune..."
              placeholderTextColor={colors.textFaint}
              value={zoneSearch}
              onChangeText={setZoneSearch}
            />
          </View>
          <View style={{ gap: 14 }}>
            {filteredDepts.map((dept) => (
              <View key={dept.departement}>
                <Text style={styles.deptLabel}>{dept.departement}</Text>
                <View style={styles.chipsRow}>
                  {dept.communes.map((commune) => {
                    const selected = (profile.service_zones || []).includes(commune);
                    return (
                      <Pressable
                        key={commune}
                        style={[styles.zoneChip, selected && styles.zoneChipActive]}
                        onPress={() => handleToggleZone(commune)}
                      >
                        <Text style={[styles.zoneChipText, selected && styles.zoneChipTextActive]}>{commune}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {filteredDepts.length === 0 && <Text style={styles.emptyText}>Aucune commune trouvée.</Text>}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showVehicleModal} transparent animationType="fade" onRequestClose={() => setShowVehicleModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier mon véhicule</Text>
            <View style={styles.chipsRow}>
              {VEHICLE_TYPES.map((v) => (
                <Pressable
                  key={v.key}
                  style={[styles.vehicleChip, vehicleType === v.key && styles.vehicleChipActive]}
                  onPress={() => setVehicleType(v.key)}
                >
                  <Ionicons name={v.icon} size={16} color={vehicleType === v.key ? '#fff' : colors.textMuted} />
                  <Text style={[styles.vehicleChipText, vehicleType === v.key && { color: '#fff' }]}>{v.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Modèle du véhicule"
              placeholderTextColor={colors.textFaint}
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
            <TextInput
              style={styles.input}
              placeholder="Plaque d'immatriculation"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              value={licensePlate}
              onChangeText={setLicensePlate}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable style={[styles.modalBtn, styles.modalBtnOutline]} onPress={() => setShowVehicleModal(false)} disabled={savingVehicle}>
                <Text style={styles.modalBtnOutlineText}>Annuler</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button title="Enregistrer" onPress={handleSaveVehicle} loading={savingVehicle} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { textAlign: 'center', marginTop: 40, color: colors.textMuted, fontWeight: '700' },
  noticeCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#fde68a', borderRadius: radius.lg, padding: 14,
  },
  noticeSubtitle: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '700' },
  noticeCardDanger: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca', borderRadius: radius.lg, padding: 14,
  },
  noticeTitleDanger: { fontSize: 13, fontWeight: '800', color: colors.danger },
  noticeSubtitleDanger: { fontSize: 12, color: '#991b1b', fontWeight: '600', marginTop: 3 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 11, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', height: 44, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  deptLabel: { fontSize: 10, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  zoneChipActive: { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
  zoneChipText: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
  zoneChipTextActive: { color: colors.primary },
  emptyText: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center', paddingVertical: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  vehicleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
  },
  vehicleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  input: {
    height: 48, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  modalBtn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalBtnOutline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  modalBtnOutlineText: { color: colors.textMuted, fontWeight: '800', fontSize: 13 },
});
