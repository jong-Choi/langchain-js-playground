import { NextRequest, NextResponse } from "next/server";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { ChromaClient } from "chromadb";
import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import ollama from "ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchWithSecretKey } from "../multi-agent/_tools/utils";

// Ollama 모델 설정
const MODEL_NAME = "qwen3:4b";
const EMBEDDING_MODEL = "mxbai-embed-large";

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
  async (input: {
    query: string[] | string;
    limit?: number;
    filename?: string;
  }) => {
    try {
      console.log("🔍 PDF 검색 도구 시작:", { input });
      const { query, limit = 3, filename } = input;

      console.log("📋 검색 파라미터:", { query, limit, filename });

      // Chroma 클라이언트 초기화
      console.log("🔗 ChromaDB 클라이언트 연결 중...");
      const client = new ChromaClient({
        host: `${process.env.ORACLE_CHROMA_HOST}`,
        headers: { LLM_SECRET_KEY: process.env.LLM_SECRET_KEY! },
      });
      console.log("✅ ChromaDB 클라이언트 연결 완료");

      // Ollama 임베딩 함수 초기화
      console.log("🧠 Ollama 임베딩 함수 초기화 중...");
      const embedder = new OllamaEmbeddingFunction({
        model: EMBEDDING_MODEL,
        url: `${process.env.ORACLE_OLLAMA_HOST}`,
      });
      console.log("✅ 임베딩 함수 초기화 완료");

      // 컬렉션 가져오기 또는 생성
      console.log("📚 PDF 컬렉션 가져오기/생성 중...");
      const chromaCollection = await client.getOrCreateCollection({
        name: "pdfs",
        embeddingFunction: embedder,
        metadata: {
          "hnsw:space": "cosine",
        },
      });
      console.log("✅ PDF 컬렉션 준비 완료");

      // 검색 조건 설정
      console.log("🔍 검색 조건 설정 중...");
      const searchOptions: {
        queryTexts: string[];
        nResults: number;
        include: ("documents" | "metadatas" | "distances")[];
        where?: { filename: string };
      } = {
        queryTexts: typeof query === "string" ? [query] : [...query],
        nResults: limit,
        include: ["documents", "metadatas", "distances"],
      };

      // 파일명 필터 추가
      if (filename) {
        searchOptions.where = { filename: filename };
        console.log("📁 파일명 필터 적용:", filename);
      }

      console.log("🔍 검색 옵션:", searchOptions);

      // 검색 수행
      console.log("🚀 ChromaDB 검색 실행 중...");
      let results = await chromaCollection.query(searchOptions);
      console.log("✅ 검색 완료, 결과:", {
        documentsCount: results.documents?.[0]?.length || 0,
        metadatasCount: results.metadatas?.[0]?.length || 0,
        distancesCount: results.distances?.[0]?.length || 0,
      });

      if (filename && !results.documents?.[0]?.length) {
        delete searchOptions.where;
        results = await chromaCollection.query(searchOptions);
        console.log("✅ 검색 완료, 결과:", {
          documentsCount: results.documents?.[0]?.length || 0,
          metadatasCount: results.metadatas?.[0]?.length || 0,
          distancesCount: results.distances?.[0]?.length || 0,
        });
      }

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
    description: "PDF 문서에서 특정 내용을 검색합니다.",
    schema: z.object({
      query: z.array(z.string()).describe("검색할 질문이나 키워드 (string[])"),
      limit: z.number().optional().describe("반환할 결과 수. (기본값: 3)"),
      filename: z.string().optional().describe("기본값: undefined"),
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

const INITIAL_SYSTEM_MESSAGE = `사용자에게 한국어로 대답하세요. pdf_search 도구를 사용하여 답하세요.
1. limit 파라미터가 크면 답변이 부정확해집니다. 3개 이하가 좋습니다. 1개의 pdf당 1000자를 가지고 있거든요.
2. 사용자의 질문의 요지에 맞는 대답을 하세요.
3. 사용자가 pdf 파일명을 정확하게 질문하였을 때에만 filename 파라미터를 사용하세요.
4. 항상 한국어로 대답하세요.
5. 대답의 마지막에는 pdf 검색 결과를 3줄로 요약해서 인용해주세요.`;

// LangChain 메시지 배열
let messages = [new SystemMessage({ content: INITIAL_SYSTEM_MESSAGE })];

// LangChain Ollama 래퍼
const model = new ChatOllama({
  baseUrl: `${process.env.ORACLE_OLLAMA_HOST}`,
  model: MODEL_NAME,
  streaming: false,
  fetch: fetchWithSecretKey,
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
