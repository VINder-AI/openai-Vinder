import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  const { content } = await req.json();

  // Add message to the thread
  await openai.beta.threads.messages.create(params.threadId, {
    role: "user",
    content,
  });

  // Start the assistant run and stream the result
  const stream = await openai.beta.threads.runs.stream(params.threadId, {
    assistant_id: assistantId,
  });

  return new Response(stream.toReadableStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
