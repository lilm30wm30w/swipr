import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  makeMutable,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import GradientView from '../../components/GradientView';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import TradeProposalCard from '../../components/TradeProposalCard';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { Message, MainStackParamList, Match, Item, TradeProposal } from '../../types';
import { haptic } from '../../lib/haptics';
import { grantAchievement } from '../../lib/achievements';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Props = StackScreenProps<MainStackParamList, 'Chat'>;

function MessageBubble({ message, isMine, isNew }: { message: Message; isMine: boolean; isNew: boolean }) {
  const anim = useSharedValue(isNew ? 0 : 1);

  useEffect(() => {
    if (isNew) {
      anim.value = withSpring(1, { damping: 14, stiffness: 150 });
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [12, 0]) }],
  }));

  return (
    <Animated.View style={[styles.messageRow, isMine && styles.messageRowMine, style]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.content}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
}

function TypingDot({ d }: { d: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: d.value,
    transform: [{ scale: d.value }],
  }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function TypingIndicator() {
  const dots = useRef([makeMutable(0.3), makeMutable(0.3), makeMutable(0.3)]).current;

  useEffect(() => {
    dots.forEach((d, i) => {
      d.value = withRepeat(
        withSequence(
          withDelay(i * 160, withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withDelay(Math.max(0, 320 - i * 160), withTiming(0.3, { duration: 0 })),
        ),
        -1, false,
      );
    });
  }, []);

  return (
    <View style={styles.messageRow}>
      <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
        {dots.map((d, i) => <TypingDot key={i} d={d} />)}
      </View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }: Props) {
  const { matchId, matchedUser } = route.params;
  const { user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 52;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [myItem, setMyItem] = useState<Item | null>(null);
  const [theirItem, setTheirItem] = useState<Item | null>(null);
  const [proposal, setProposal] = useState<TradeProposal | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: () => (
        <View style={styles.headerTitleWrap}>
          {matchedUser.avatar_url ? (
            <Image source={{ uri: matchedUser.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <GradientView colors={[colors.primary, colors.primaryDark]} style={styles.headerAvatar}>
              <Text style={styles.headerAvatarInitial}>{matchedUser.username?.[0]?.toUpperCase() ?? '?'}</Text>
            </GradientView>
          )}
          <View>
            <Text style={styles.headerUsername}>@{matchedUser.username}</Text>
            {theyAreTyping && <Text style={styles.headerTyping}>typing...</Text>}
          </View>
        </View>
      ),
      headerBackground: () => (
        <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.headerBorder} />
        </BlurView>
      ),
    });
  }, [navigation, matchedUser, theyAreTyping]);

  useEffect(() => {
    fetchMessages();
    fetchMatch();
    fetchProposal();

    const chan = supabase
      .channel(`chat:${matchId}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const m = payload.new as Message;
        if (knownIds.current.has(m.id)) return;
        knownIds.current.add(m.id);
        setMessages((prev) => [...prev, m]);
        if (m.sender_id !== user?.id) haptic.tap();
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trade_proposals',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        fetchProposal();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        setMatch((prev) => prev ? { ...prev, ...(payload.new as Match) } : prev);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = (payload.payload as { user_id: string } | undefined)?.user_id;
        if (!senderId || senderId === user?.id) return;
        setTheyAreTyping(true);
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setTheyAreTyping(false), 2800);
      })
      .subscribe();

    typingChannelRef.current = chan;

    return () => {
      supabase.removeChannel(chan);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
  }, [matchId]);

  async function fetchMatch() {
    if (!user) return;
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        items_item1:items!matches_item1_id_fkey(id, user_id, title, images, category, condition, description, is_available, created_at),
        items_item2:items!matches_item2_id_fkey(id, user_id, title, images, category, condition, description, is_available, created_at)
      `)
      .eq('id', matchId)
      .single();
    if (!data) return;
    const isUser1 = data.user1_id === user.id;
    setMatch(data as Match);
    setMyItem(isUser1 ? (data as any).items_item1 : (data as any).items_item2);
    setTheirItem(isUser1 ? (data as any).items_item2 : (data as any).items_item1);
  }

  async function fetchProposal() {
    const { data } = await supabase
      .from('trade_proposals')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setProposal((data as TradeProposal) ?? null);
  }

  async function handlePropose() {
    if (!user) return;
    setProposalBusy(true);
    haptic.press();
    const { error } = await supabase.from('trade_proposals').insert({
      match_id: matchId,
      proposer_id: user.id,
      status: 'pending',
    });
    setProposalBusy(false);
    if (error) { toast.error('Failed to propose'); return; }
    toast.success('Trade proposed');
    fetchProposal();
  }

  async function handleWithdraw() {
    if (!proposal) return;
    setProposalBusy(true);
    haptic.tap();
    const { error } = await supabase.from('trade_proposals').delete().eq('id', proposal.id);
    setProposalBusy(false);
    if (error) { toast.error('Failed to withdraw'); return; }
    toast.success('Proposal withdrawn');
    setProposal(null);
  }

  async function handleDecline() {
    if (!proposal) return;
    setProposalBusy(true);
    haptic.tap();
    const { error } = await supabase.from('trade_proposals').update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', proposal.id);
    setProposalBusy(false);
    if (error) { toast.error('Failed to decline'); return; }
    toast.success('Trade declined');
    fetchProposal();
  }

  async function handleAccept() {
    if (!proposal || !user) return;
    setProposalBusy(true);
    const { error: tradeError } = await supabase.rpc('complete_trade', {
      p_match_id: matchId,
      p_proposal_id: proposal.id,
    });

    if (tradeError) {
      setProposalBusy(false);
      toast.error('Failed to complete trade');
      return;
    }

    if (match) {
      await grantAchievement(match.user1_id, 'first_trade');
      await grantAchievement(match.user2_id, 'first_trade');

      for (const uid of [match.user1_id, match.user2_id]) {
        const { count } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .eq('status', 'completed');
        if (count !== null && count >= 3) await grantAchievement(uid, 'three_trades');
      }
    }

    setProposalBusy(false);
    haptic.match();
    toast.success('Trade completed! 🎉');
    fetchProposal();
    fetchMatch();
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (data) {
      data.forEach((m) => knownIds.current.add(m.id));
      setMessages(data);
    }
  }

  function handleInputChange(text: string) {
    setInput(text);
    const now = Date.now();
    if (!user || !typingChannelRef.current) return;
    if (now - lastTypingSentRef.current > 1500 && text.length > 0) {
      lastTypingSentRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user.id },
      });
    }
  }

  async function sendMessage() {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    haptic.tap();
    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: user.id,
      content,
    });
    if (error) {
      toast.error('Failed to send');
      setInput(content);
    }
    setSending(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              isMine={item.sender_id === user?.id}
              isNew={index === messages.length - 1}
            />
          )}
          contentContainerStyle={[styles.messageList, { paddingTop: headerHeight + 12 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            match ? (
              <TradeProposalCard
                myItem={myItem}
                theirItem={theirItem}
                proposal={proposal}
                iAmProposer={proposal?.proposer_id === user?.id}
                matchCompleted={match.status === 'completed'}
                busy={proposalBusy}
                onPropose={handlePropose}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onWithdraw={handleWithdraw}
              />
            ) : null
          }
          ListFooterComponent={theyAreTyping ? <TypingIndicator /> : null}
          ListEmptyComponent={
            <EmptyState
              icon="👋"
              title="Say hi!"
              subtitle={`You and @${matchedUser.username} matched. Break the ice and start negotiating.`}
            />
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
          />
          <PressableScale
            onPress={sendMessage}
            disabled={sending || !input.trim()}
            style={styles.sendBtn}
            hapticOnPressIn="none"
            pressedScale={0.88}
          >
            <GradientView
              colors={input.trim() ? [colors.primary, colors.primaryDark] : [colors.border, colors.border]}
              style={styles.sendGradient}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </GradientView>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary,
  },
  headerAvatarInitial: { color: '#fff', fontSize: 14, fontWeight: '800' },
  headerUsername: { color: colors.text, fontSize: 15, fontWeight: '800' },
  headerTyping: { color: colors.primaryLight, fontSize: 11, fontWeight: '600' },
  headerBorder: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: colors.border,
  },
  messageList: { paddingHorizontal: 16, gap: 4, paddingBottom: 12, flexGrow: 1 },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 4 },
  messageRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%' as const, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleTheirs: {},
  bubbleMine: {
    backgroundColor: colors.primary, borderColor: colors.primaryDark,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 6,
  },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  typingDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: colors.primaryLight,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    gap: 10,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(167,139,250,0.18)',
    backgroundColor: 'rgba(10,5,20,0.78)',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '800' },
});
