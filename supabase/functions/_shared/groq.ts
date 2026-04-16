type GroqChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(opts: {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
}) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY secret");

  const model = opts.model ?? Deno.env.get("GROQ_MODEL") ?? "openai/gpt-oss-120b";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Groq returned an empty response");
  }

  return content;
}
