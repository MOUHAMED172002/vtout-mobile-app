import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { updateMyProfile, uploadAvatar } from '../services/userService';
import Button from '../components/Button';

export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, profile, getToken, updateAuthUser, refreshProfile } = useAuth();

  const [fullname, setFullname] = useState(profile?.fullname || user?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || user?.image || null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const handleSave = async () => {
    if (!fullname.trim()) {
      Alert.alert('Nom requis', 'Merci de renseigner votre nom complet.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      let avatarUrl = profile?.avatar_url || user?.image || null;

      if (avatarChanged && avatarUri) {
        setUploadingAvatar(true);
        avatarUrl = await uploadAvatar({ uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' }, token);
        setUploadingAvatar(false);
      }

      const nameChanged = fullname.trim() !== (user?.name || '');
      if (nameChanged || (avatarChanged && avatarUrl)) {
        const authFields = {};
        if (nameChanged) authFields.name = fullname.trim();
        if (avatarChanged && avatarUrl) authFields.image = avatarUrl;
        await updateAuthUser(authFields);
      }

      await updateMyProfile({ fullname: fullname.trim(), phone: phone.trim(), avatar_url: avatarUrl }, token);
      await refreshProfile();

      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de mettre à jour le profil pour le moment.");
    } finally {
      setUploadingAvatar(false);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{(fullname || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Touchez la photo pour la modifier</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nom complet</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={17} color={colors.textFaint} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Votre nom complet"
              placeholderTextColor={colors.textFaint}
              value={fullname}
              onChangeText={setFullname}
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
            <Ionicons name="mail-outline" size={17} color={colors.textFaint} style={styles.inputIcon} />
            <Text style={styles.inputDisabledText} numberOfLines={1}>{user?.email}</Text>
          </View>

          <Text style={styles.label}>Téléphone (WhatsApp)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={17} color={colors.textFaint} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+229 00 00 00 00"
              placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Button title="Enregistrer" onPress={handleSave} loading={saving} style={{ marginTop: 16 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, alignItems: 'center' },
  avatarWrap: { marginTop: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  avatarInitial: { color: '#fff', fontSize: 34, fontWeight: '900' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background,
  },
  avatarHint: { fontSize: 11.5, color: colors.textFaint, fontWeight: '600', marginTop: 10, marginBottom: 8 },
  form: { width: '100%', marginTop: 16 },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 12 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 50, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14,
  },
  inputWrapDisabled: { backgroundColor: colors.background },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  inputDisabledText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textFaint },
});
