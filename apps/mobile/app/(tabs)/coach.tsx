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
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 60}
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
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <MessageItem item={item} />}
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          multiline
        />
        <PrimaryButton
          title={sending ? "Sending..." : "Send"}
          onPress={onSend}
          loading={sending}
          disabled={!draft.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#374151", lineHeight: 20 },
  listContent: {
    paddingVertical: 8,
    gap: 10,
  },
  bubble: {
    maxWidth: "88%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#111827",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#ffffff" },
  bubbleTextAssistant: { color: "#111827" },
  composer: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: "top",
  },
});
