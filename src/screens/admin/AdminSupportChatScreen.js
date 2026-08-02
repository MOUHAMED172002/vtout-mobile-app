import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getConversationMessages } from '../../services/adminSupportService';
import { socketService } from '../../services/socketService';
import Loading from '../../components/Loading';

export default function AdminSupportChatScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { conversationId, customerId, customerName } = route.params;
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: customerName || `Client #${customerId.slice(0, 8)}` });
  }, [customerName, customerId, navigation]);

  const handleNewMessage = useCallback((msg) => {
    if (msg.conversation_id !== conversationId) return;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, [conversationId]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const history = await getConversationMessages(conversationId, token);
        setMessages(history);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();

    const unsub = socketService.subscribe('new_message', handleNewMessage);
    return unsub;
  }, [conversationId, getToken, handleNewMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || !user?.id) return;
    socketService.emit('send_message', {
      sender_id: user.id,
      receiver_id: customerId,
      content: input.trim(),
      conversation_id: conversationId,
    });
    setInput('');
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>Aucun message dans cette conversation.</Text>
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
            placeholder="Répondre au client..."
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

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.5 },
  emptyText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: colors.textMuted },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
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
