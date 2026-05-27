import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

type SummarizeMode = "specific" | "general";

type SummarizeRequestBody = {
  text?: string;
  mode?: SummarizeMode;
};

const SHARED_RULES = [
  "Formatting rules:",
  "- Output a single sentence, no leading bullet character, no quotes, no preface like 'Summary:'.",
  "- Use markdown only for emphasis: wrap the 1–2 most important phrases in **bold**. You may also wrap code identifiers in `backticks`.",
  "- No headings, no lists, no links.",
  "- Do not invent facts that aren't supported by the input.",
].join("\n");

const SPECIFIC_SYSTEM = [
  "You compress study material into a single concise note for a learner.",
  "Style: keep the concrete example, variable names, and specific details from the input.",
  "Length: up to ~25 words.",
  "Preserve critical technical terms, function names, and code identifiers verbatim.",
  SHARED_RULES,
].join("\n");

const GENERAL_SYSTEM = [
  "You distill study material into a single reusable, generalised principle for a learner's reference.",
  "Style: strip away the specific example, variable names, project context, or one-off details. Phrase it as a portable rule of thumb the learner could apply across many situations.",
  "Length: up to ~25 words.",
  "Keep only the underlying concept name(s) and technical terminology required to express the principle clearly.",
  SHARED_RULES,
].join("\n");

function systemFor(mode: SummarizeMode): string {
  return mode === "general" ? GENERAL_SYSTEM : SPECIFIC_SYSTEM;
}

function userPromptFor(mode: SummarizeMode, text: string): string {
  if (mode === "general") {
    return `Distill the following into one generalised, reusable one-sentence note (no specific example, no project-specific details):\n\n${text}`;
  }
  return `Summarize the following into one concise one-sentence note suitable as a study bullet:\n\n${text}`;
}

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

  const mode: SummarizeMode = body.mode === "general" ? "general" : "specific";

  try {
    const { text: summary } = await generateText({
      model: openai("gpt-5.5"),
      system: systemFor(mode),
      prompt: userPromptFor(mode, text),
    });

    return Response.json({ summary: summary.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    return new Response(message, { status: 500 });
  }
}
