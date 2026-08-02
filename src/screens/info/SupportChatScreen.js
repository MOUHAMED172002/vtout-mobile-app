import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMyConversation } from '../../services/supportService';
import { socketService } from '../../services/socketService';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

export default function SupportChatScreen({ navigation }) {
  const { isSignedIn, user, getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  const handleNewMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    (async () => {
      try {
        const token = await getToken();
        const history = await getMyConversation(token);
        setMessages(history);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();

    const unsub = socketService.subscribe('new_message', handleNewMessage);
    return unsub;
  }, [isSignedIn, getToken, handleNewMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || !user?.id) return;
    socketService.emit('send_message', {
      sender_id: user.id,
      content: input.trim(),
      conversation_id: `${user.id}_admin`,
    });
    setInput('');
  };

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.guestWrap}>
          <View style={styles.guestIcon}>
            <Ionicons name="chatbox-ellipses-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.guestTitle}>Connectez-vous pour discuter</Text>
          <Text style={styles.guestSubtitle}>Notre équipe de support répond directement dans l'app.</Text>
          <Button title="Se connecter" onPress={() => navigation.navigate('Login')} style={{ marginTop: 20, minWidth: 200 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>Commencez la discussion avec notre équipe.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, idx) => String(item.id || idx)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === user.id;
              return (
                <View style={[styles.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {!isMe && item.sender?.role === 'admin' && (
                      <Text style={styles.adminTag}>Support Vtout</Text>
                    )}
                    <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  guestTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  guestSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.5 },
  emptyText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: colors.textMuted },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  adminTag: { fontSize: 9, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', marginBottom: 4 },
  bubbleText: { fontSize: 13, color: colors.text, fontWeight: '600', lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center',
  },
  input: {
    flex: 1, height: 46, backgroundColor: colors.background, borderRadius: radius.full,
    paddingHorizontal: 16, fontSize: 13, fontWeight: '600', color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
