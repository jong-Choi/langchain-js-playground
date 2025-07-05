import { NextRequest, NextResponse } from "next/server";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { ChromaClient, EmbeddingFunction } from "chromadb";
import ollama from "ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Ollama 모델 설정
const MODEL_NAME = "qwen3:4b";
const EMBEDDING_MODEL = "mxbai-embed-large";

// Ollama 임베딩 함수 구현
class OllamaEmbeddingFunction implements EmbeddingFunction {
  private model: string;
  private url: string;

  constructor({ model, url }: { model: string; url: string }) {
    this.model = model;
    this.url = url;
  }

  async generate(texts: string[]): Promise<number[][]> {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await fetch(`${this.url}/api/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            prompt: text,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        embeddings.push(data.embedding);
      } catch (error) {
        console.error("임베딩 생성 중 오류:", error);
        throw error;
      }
    }
    return embeddings;
  }
}

// 모델이 설치되어 있는지 확인하는 함수
async function ensureModelExists(modelName: string) {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some(
      (model: { name: string }) => model.name === modelName
    );

    if (!modelExists) {
      console.log(`모델 ${modelName}을 다운로드 중...`);
      await ollama.pull({ model: modelName });
      console.log(`모델 ${modelName} 다운로드 완료`);
    }
  } catch (error) {
    console.error("모델 확인/다운로드 중 에러:", error);
    throw new Error("모델을 준비할 수 없습니다.");
  }
}

// PDF 전용 검색 도구
const pdfSearchTool = tool(
  async (input: { query: string; limit?: number; filename?: string }) => {
    try {
      const { query, limit = 2, filename } = input;

      // Chroma 클라이언트 초기화
      const client = new ChromaClient({
        host: "localhost",
        port: 8000,
      });

      // Ollama 임베딩 함수 초기화
      const embedder = new OllamaEmbeddingFunction({
        model: EMBEDDING_MODEL,
        url: "http://localhost:11434",
      });

      // 컬렉션 가져오기 또는 생성
      const chromaCollection = await client.getOrCreateCollection({
        name: "pdfs",
        embeddingFunction: embedder,
        metadata: {
          "hnsw:space": "cosine",
        },
      });

      // 검색 조건 설정
      const searchOptions: {
        queryTexts: string[];
        nResults: number;
        include: ("documents" | "metadatas" | "distances")[];
        where?: { filename: string };
      } = {
        queryTexts: [query],
        nResults: limit,
        include: ["documents", "metadatas", "distances"],
      };

      // 파일명 필터 추가
      if (filename) {
        searchOptions.where = { filename: filename };
      }

      // 검색 수행
      const results = await chromaCollection.query(searchOptions);

      // 검색 결과 포맷팅
      const formattedResults =
        results.documents?.[0]?.map((doc, index) => ({
          id: index + 1,
          content: doc,
          metadata: results.metadatas?.[0]?.[index] || {},
          score: results.distances?.[0]?.[index]
            ? (1 - results.distances[0][index]).toFixed(4)
            : "N/A",
        })) || [];

      return JSON.stringify(
        {
          query,
          results: formattedResults,
          totalFound: formattedResults.length,
        },
        null,
        2
      );
    } catch (error) {
      console.error("PDF 검색 중 오류:", error);
      return `PDF 검색 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`;
    }
  },
  {
    name: "pdf_search",
    description:
      "PDF 문서에서 특정 내용을 검색합니다. PDF 파일명을 지정하면 해당 파일에서만 검색할 수 있습니다.",
    schema: z.object({
      query: z.string().describe("검색할 질문이나 키워드"),
      limit: z.number().optional().describe("반환할 결과 수 (기본값: 2)"),
      filename: z.string().optional().describe("검색할 PDF 파일명 (선택사항)"),
    }),
  }
);

function convertMessagesToChatHistory(messages: BaseMessage[]) {
  return messages.map((msg) => {
    const role =
      typeof msg._getType === "function"
        ? msg._getType() === "human"
          ? "user"
          : msg._getType() === "ai"
          ? "assistant"
          : "system"
        : "user";

    return { role, content: msg.content };
  });
}

const INITIAL_SYSTEM_MESSAGE = `사용자에게 한국어로 대답하세요. pdf_search 도구를 사용하여 답하세요.`;
// LangChain 메시지 배열
let messages = [new SystemMessage({ content: INITIAL_SYSTEM_MESSAGE })];

// LangChain Ollama 래퍼
const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: MODEL_NAME,
  streaming: false,
});

// RAG 에이전트 생성 (PDF 검색 도구만 사용)
const tools = [pdfSearchTool];

const agent = createReactAgent({
  llm: model,
  tools: tools,
});

export async function POST(request: NextRequest) {
  try {
    const { userInput } = await request.json();

    if (!userInput || userInput === "exit") {
      return NextResponse.json({
        message: "대화가 종료되었습니다.",
        aiResponse: null,
      });
    }

    // 두 모델 모두 체크
    await ensureModelExists(MODEL_NAME);
    await ensureModelExists(EMBEDDING_MODEL);

    const safeInput =
      typeof userInput === "string" ? userInput : String(userInput ?? "");
    messages.push(new HumanMessage({ content: String(safeInput) }));

    // RAG 에이전트 호출
    const result = await agent.invoke({
      messages: convertMessagesToChatHistory(messages),
    });

    // result.messages의 마지막 메시지가 AI 응답
    const aiContent = String(result?.messages?.slice(-1)[0]?.content || "");
    messages.push(new AIMessage({ content: aiContent }));

    return NextResponse.json({
      message: "RAG 에이전트 응답입니다.",
      aiResponse: aiContent,
    });
  } catch (error) {
    console.error("RAG API 에러:", error);
    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 대화 기록을 초기화하는 엔드포인트
export async function DELETE() {
  try {
    messages = [new SystemMessage({ content: INITIAL_SYSTEM_MESSAGE })];

    return NextResponse.json({
      message: "RAG 대화 기록이 초기화되었습니다.",
    });
  } catch (error) {
    console.error("초기화 에러:", error);
    return NextResponse.json(
      { error: "초기화 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 현재 대화 기록을 조회하는 엔드포인트
export async function GET() {
  try {
    return NextResponse.json({
      message: "현재 RAG 대화 기록입니다.",
      messages: messages.map((msg) => ({
        type: typeof msg._getType === "function" ? msg._getType() : "unknown",
        content: msg.content,
      })),
    });
  } catch (error) {
    console.error("조회 에러:", error);
    return NextResponse.json(
      { error: "대화 기록 조회 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 모델 초기화 엔드포인트
export async function PUT() {
  try {
    // 두 모델 모두 체크
    await ensureModelExists(MODEL_NAME);
    await ensureModelExists(EMBEDDING_MODEL);
    return NextResponse.json({
      message: "RAG 모델이 준비되었습니다.",
      model: MODEL_NAME,
      embeddingModel: EMBEDDING_MODEL,
    });
  } catch (error) {
    console.error("모델 초기화 에러:", error);
    return NextResponse.json(
      { error: "모델 초기화 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
