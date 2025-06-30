export let assistantId = process.env.ASSISTANT_ID || "";

if (!assistantId) {
  console.error("Missing ASSISTANT_ID in environment variables.");
}