import { NextRequest, NextResponse } from "next/server";
import { retrieveGroundedSources } from "@/lib/rag/retrieval";
import { Message } from "@/types";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3"; // Change model based on what you have pulled

/**
 * POST /api/chat
 * Streams grounded RAG answers back to the user, citing relevant verses and Hadiths.
 * Response is structured as Server-Sent Events (SSE) to deliver citations alongside text.
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

    // 2. Retrieval of Grounded Sources
    let citations = await retrieveGroundedSources(query, {
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

    // 4. Set up Streaming Response Headers
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        // Track whether the SSE stream has already been closed to avoid duplicate closes
        let streamClosed = false;
        // Step A: Immediately send the sources/citations to the client
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", data: citations })}\n\n`)
        );

        try {
          // Step B: Send past messages for standard conversation history context
          const chatMessagesForAPI = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-5).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ];

          // Step C: Trigger streaming completion from Ollama
          if (OLLAMA_CHAT_MODEL === "mock") {
            let mockAnswer = "";
            if (citations.length > 0) {
               mockAnswer = `**MOCK GENERATOR MODE:**\n\nThe Vector Database perfectly understood your query and returned exactly ${citations.length} authentic sources. \n\nFor example, looking at the top result (**${citations[0].title}**), it states: \n*"${citations[0].text_english}"*\n\n*(Note: Your Qwen chat model is still downloading at 118 KB/s. Until it finishes, I am using this dynamic mock to prove that the database retrieval is working perfectly for any topic you search! Check out the real citation cards on the right!)*`;
            } else {
               mockAnswer = `**MOCK GENERATOR MODE:**\n\nI searched the vector database but could not find any authentic verses or Hadiths matching your specific query. Try asking something else!`;
            }

            const tokens = mockAnswer.split(" ");
            for (let i = 0; i < tokens.length; i++) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", data: tokens[i] + (i < tokens.length - 1 ? " " : "") })}\n\n`)
              );
              await new Promise(r => setTimeout(r, 60)); // Simulate typing speed
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
            return;
          }

          const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: OLLAMA_CHAT_MODEL,
              messages: chatMessagesForAPI,
              stream: true,
              options: {
                temperature: 0.1, // Highly deterministic to prevent hallucination
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama API returned ${response.status}: ${await response.text()}`);
          }

          if (!response.body) {
            throw new Error("Ollama API returned an empty body.");
          }

          // Step D: Stream text chunks to the client as they arrive
          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // Keep the last partial line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine) continue;

              try {
                const parsed = JSON.parse(cleanLine);
                if (parsed.message?.content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", data: parsed.message.content })}\n\n`)
                  );
                }
              } catch (parseError) {
                console.warn("Failed to parse Ollama JSON line:", cleanLine, parseError);
              }
            }
          }

          // Step E: Close the stream safely
          if (!streamClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
            streamClosed = true;
          }
        } catch (streamError) {
          // Error handling – only send error if stream not already closed
          if (!streamClosed) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  data: "A streaming failure occurred during response generation. Make sure Ollama is running."
                })}\n\n`
              )
            );
            controller.close();
            streamClosed = true;
          }
          console.error("Error during Ollama chat completions stream:", streamError);
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
