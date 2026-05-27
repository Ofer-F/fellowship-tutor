import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

type SummarizeRequestBody = {
  text?: string;
};

const SUMMARIZE_SYSTEM = [
  "You compress study material into a single concise bullet for a learner's note.",
  "Hard rules:",
  "- Output exactly one sentence.",
  "- No more than 25 words.",
  "- Plain text only: no leading bullet, no quotes, no markdown, no preface like 'Summary:'.",
  "- Preserve critical technical terms, function names, and code identifiers verbatim.",
  "- Keep the original meaning; do not invent facts that aren't in the input.",
].join("\n");

export async function POST(req: Request): Promise<Response> {
  let body: SummarizeRequestBody;
  try {
    body = (await req.json()) as SummarizeRequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return new Response("Missing text", { status: 400 });
  }

  try {
    const { text: summary } = await generateText({
      model: openai("gpt-5.5"),
      system: SUMMARIZE_SYSTEM,
      prompt: `Summarize the following into one short sentence suitable as a study-note bullet:\n\n${text}`,
    });

    return Response.json({ summary: summary.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    return new Response(message, { status: 500 });
  }
}
