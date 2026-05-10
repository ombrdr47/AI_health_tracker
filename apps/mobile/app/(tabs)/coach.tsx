import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
} from "react-native";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { PrimaryButton } from "../../src/components/PrimaryButton";

import Markdown from 'react-native-markdown-display';

type CoachMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

function TypingIndicator() {
  const dot1 = React.useRef(new Animated.Value(0)).current;
  const dot2 = React.useRef(new Animated.Value(0)).current;
  const dot3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = anim(dot1, 0); const a2 = anim(dot2, 150); const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.bubbleAssistant}>
      <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4 }}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#9CA3AF", transform: [{ translateY: d }] }} />
        ))}
      </View>
    </View>
  );
}

const MessageItem = React.memo(({ item }: { item: CoachMessage }) => {
  const isUser = item.role === "user";
  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
      ]}
    >
      {isUser ? (
        <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
          {item.content}
        </Text>
      ) : (
        <Markdown
          style={{
            body: { fontSize: 14, lineHeight: 20, color: "#111827" },
            heading1: { fontSize: 18, fontWeight: "800", marginVertical: 4 },
            heading2: { fontSize: 16, fontWeight: "700", marginVertical: 4 },
            heading3: { fontSize: 15, fontWeight: "600", marginVertical: 4 },
            paragraph: { marginVertical: 4 },
            list_item: { marginVertical: 2 },
          }}
        >
          {item.content}
        </Markdown>
      )}
    </View>
  );
});

export default function CoachScreen() {
  const { session } = useSession();

  const [messages, setMessages] = React.useState<CoachMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const listRef = React.useRef<FlatList<CoachMessage>>(null);

  const loadMessages = React.useCallback(async () => {
    if (!session?.user?.id) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("coach_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        Alert.alert("Load failed", error.message);
        return;
      }

      setMessages((data ?? []) as CoachMessage[]);
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const onClearChat = () => {
    Alert.alert(
      "New Chat",
      "This will clear your current conversation history. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Clear", 
          style: "destructive", 
          onPress: async () => {
            if (!session?.user?.id) return;
            setMessages([]);
            await supabase.from("coach_messages").delete().eq("user_id", session.user.id);
          }
        }
      ]
    );
  };

  const onSend = async () => {
    if (!session?.access_token) return;

    const message = draft.trim();
    if (!message) return;

    setDraft("");

    // Optimistic append for responsiveness.
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      },
    ]);

    setSending(true);
    try {
      const { error, response } = await supabase.functions.invoke("coach-chat", {
        body: { message },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const status = response?.status;

        let serverText: string | null = null;
        if (response) {
          try {
            serverText = await response.text();
          } catch {
            serverText = null;
          }
        }

        let serverMessage: string | null = null;
        if (serverText) {
          try {
            const parsed: unknown = JSON.parse(serverText);
            if (parsed && typeof parsed === "object") {
              const p = parsed as Record<string, unknown>;
              serverMessage =
                (typeof p.error === "string" && p.error) ||
                (typeof p.message === "string" && p.message) ||
                null;
            }
          } catch {
            serverMessage = serverText;
          }
        }

        const errorMessage =
          typeof status === "number"
            ? `HTTP ${status}${serverMessage ? `: ${serverMessage}` : ""}`
            : error.message;

        Alert.alert("Coach failed", errorMessage);
      }

      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 116 : 0}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 6 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>
            Ask about your meals, cravings, routines, and realistic next steps.
          </Text>
        </View>
        <Pressable 
          onPress={onClearChat} 
          style={{ backgroundColor: "#111827", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>New Chat</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages.filter((m) => m.role !== "system")}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={loadMessages}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <MessageItem item={item} />}
        ListFooterComponent={sending ? <TypingIndicator /> : null}
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask your coach..."
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          multiline
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <Pressable
          onPress={onSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F3F4FF",  // soft indigo tint
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#374151", lineHeight: 20 },
  listContent: {
    paddingVertical: 8,
    gap: 8,
  },
  bubble: {
    maxWidth: "88%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#4F46E5",   // indigo
    borderBottomRightRadius: 4,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#FEFEFE",
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#4F46E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#ffffff", fontWeight: "500" },
  bubbleTextAssistant: { color: "#111827" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    minHeight: 36,
    maxHeight: 120,
    textAlignVertical: "top",
    paddingTop: 6,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#C7D2FE",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});
