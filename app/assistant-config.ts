export let assistantId = ""; // Set your assistant ID here.

if (assistantId === "") {
  assistantId = process.env.ASSISTANT_ID || ""; // Default to an empty string if the env variable isn't set.
}

if (!assistantId) {
  console.error("Assistant ID is missing. Please check your environment variables.");
  // You can throw an error here or handle it as needed.
}
