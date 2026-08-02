import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { getAllConfigs } from '../../services/configService';
import Loading from '../../components/Loading';

export default function ContactScreen() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllConfigs()
      .then((data) => {
        const map = (data || []).reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
        setConfig(map);
      })
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const phone = config.CONTACT_PHONE || '+229 61 00 00 00';
  const email = config.CONTACT_EMAIL || 'contact@vtout.com';
  const whatsapp = config.WHATSAPP;
  const whatsappUrl = whatsapp ? (whatsapp.startsWith('http') ? whatsapp : `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`) : null;

  const CONTACTS = [
    { icon: 'call', label: 'Téléphone', value: phone, action: () => Linking.openURL(`tel:${phone}`) },
    { icon: 'mail', label: 'Email', value: email, action: () => Linking.openURL(`mailto:${email}`) },
    ...(whatsappUrl ? [{ icon: 'logo-whatsapp', label: 'WhatsApp', value: 'Discuter sur WhatsApp', action: () => Linking.openURL(whatsappUrl) }] : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={styles.intro}>Notre équipe est disponible pour répondre à toutes vos questions.</Text>
        {CONTACTS.map((c) => (
          <Pressable key={c.label} style={styles.row} onPress={c.action}>
            <View style={styles.icon}>
              <Ionicons name={c.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{c.label}</Text>
              <Text style={styles.value}>{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  intro: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600', marginBottom: 6, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  icon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase' },
  value: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 2 },
});
