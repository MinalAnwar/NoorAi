import { NextRequest, NextResponse } from "next/server";
import { retrieveGroundedSources } from "@/lib/rag/retrieval";
import { streamCFAIChat } from "@/lib/ai/cloud-ai";
import { Message } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/chat
 * Streams grounded RAG answers back to the user, citing relevant verses and Hadiths.
 * Response is structured as Server-Sent Events (SSE) to deliver citations alongside text.
 * Chat inference powered by Cloudflare Workers AI (llama-3.3-70b-instruct-fp8-fast).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, focusSource = "all" } = body as {
      messages: Message[];
      focusSource?: "all" | "quran" | "hadith";
    };

    // 1. Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload. 'messages' array is required." },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "The last message in the sequence must be a user message." },
        { status: 400 }
      );
    }

    const query = lastMessage.content.trim();
    if (!query) {
      return NextResponse.json(
        { error: "User message content cannot be empty." },
        { status: 400 }
      );
    }

    // 2. Retrieval of Grounded Sources (includes query expansion internally)
    const citations = await retrieveGroundedSources(query, {
      limit: 5,
      sourceFocus: focusSource,
      semanticWeight: 0.7,
    });

    // 3. Construct System Prompt grounding the AI
    let groundedContext = "";
    if (citations.length > 0) {
      groundedContext = citations
        .map((source, index) => {
          if (source.type === "quran") {
            return `[SOURCE #${index + 1}]
Type: Quranic Verse
Reference: ${source.source_reference} (Surah ${source.metadata.surah_name_en})
Arabic: ${source.text_arabic}
English Translation: ${source.text_english}
`;
          } else {
            return `[SOURCE #${index + 1}]
Type: Hadith Record
Reference: ${source.source_reference}
Grade: ${source.metadata.grade || "Unknown"}
Arabic: ${source.text_arabic}
English Translation: ${source.text_english}
`;
          }
        })
        .join("\n\n");
    } else {
      groundedContext = "No specific references found in the database for this query.";
    }

    const systemPrompt = `You are Noor AI, a highly respectful, precise, and state-of-the-art AI-powered Islamic assistant. 
Your objective is to provide objective, wise, and accurate answers about Islamic theology, jurisprudence, and history.

You MUST answer the user's query STRICTLY using the authentic sources listed under the GROUNDED CONTEXT block below.
Every single fact, ruling, or theological statement you make MUST be directly anchored to these sources. 

CITATION RULES:
- Ground your claims clearly. Refer to sources by their index number or standard notation, e.g. "as stated in [Quran 2:255]" or "according to a Sahih Hadith in [Sahih al-Bukhari #42]".
- You MUST only cite sources that are explicitly provided in the GROUNDED CONTEXT. Never reference external sources or make up verse numbers.
- If the provided context is insufficient to answer the query completely or accurately, state respectfully: "Based on the authentic sources currently indexed in my database, I do not have enough specific evidence to formulate a complete answer on this topic." Do not extrapolate, hallucinate, or theorize.

TONE & STYLE:
- Avoid emojis entirely under all circumstances. Replace visual symbols with clean headings, bullets, and text formatting.
- Maintain absolute humility, respect, and scholarly rigor. 
- Do not make absolute rulings or give personal fatwas; frame the knowledge objectively as derived from the sources.
- Present the Arabic and English translations of the text when highlighting core scriptural evidence.

GROUNDED CONTEXT:
${groundedContext}
`;

    // 4. Set up Streaming Response
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        let streamClosed = false;

        const safeClose = () => {
          if (!streamClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
            streamClosed = true;
          }
        };

        const safeError = (msg: string) => {
          if (!streamClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", data: msg })}\n\n`));
            controller.close();
            streamClosed = true;
          }
        };

        // Step A: Send citations immediately
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", data: citations })}\n\n`)
        );

        try {
          // Step B: Build messages array for Cloudflare AI
          const chatMessages = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-5).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ];

          // Step C: Get streaming response from Cloudflare Workers AI
          const cfStream = await streamCFAIChat(chatMessages);
          const reader = cfStream.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          // Step D: Parse Cloudflare SSE chunks and re-stream to client
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine || !cleanLine.startsWith("data: ")) continue;

              const jsonStr = cleanLine.slice(6); // remove "data: "
              if (jsonStr === "[DONE]") {
                safeClose();
                return;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                // Cloudflare streams as { response: "..." }
                const chunk = parsed?.response ?? "";
                if (chunk) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", data: chunk })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }

          safeClose();
        } catch (streamError) {
          console.error("Error during Cloudflare AI stream:", streamError);
          safeError("A streaming failure occurred. Please check that Cloudflare AI credentials are configured.");
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error in /api/chat Route Handler:", error);
    return NextResponse.json(
      {
        error: "An unexpected server error occurred during grounded completion.",
        message: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
