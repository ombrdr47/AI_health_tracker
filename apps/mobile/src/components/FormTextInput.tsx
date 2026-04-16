import * as React from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";

export function FormTextInput({
  label,
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, !!error && styles.inputError, props.style]}
        placeholderTextColor="#9CA3AF"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
  },
});
