import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Send a new message to a thread and stream response
export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const { content } = await req.json();

  // Add message to thread
  await openai.beta.threads.messages.create(params.threadId, {
    role: "user",
    content,
  });

  // Start streaming the assistant run
  const stream = await openai.beta.threads.runs.stream(params.threadId, {
    assistant_id: assistantId,
  });

  return new Response(stream.toReadableStream());
}