import { NextRequest, NextResponse } from "next/server";
import { StateGraph, END, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { ChromaClient } from "chromadb";
import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import ollama from "ollama";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Ollama 모델 설정
const MODEL_NAME = "qwen3:1.7b";
const EMBEDDING_MODEL = "mxbai-embed-large";
const CHAT_MODEL =
  "hf.co/cherryDavid/HyperCLOVA-X-SEED-Vision-Instruct-3B-Llamafied-Q4_K_S-GGUF:latest";

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
      const { query, limit = 10, filename } = input;

      console.log("📋 검색 파라미터:", { query, limit, filename });

      // Chroma 클라이언트 초기화
      console.log("🔗 ChromaDB 클라이언트 연결 중...");
      const client = new ChromaClient({
        host: "localhost",
        port: 8000,
      });
      console.log("✅ ChromaDB 클라이언트 연결 완료");

      // Ollama 임베딩 함수 초기화
      console.log("🧠 Ollama 임베딩 함수 초기화 중...");
      const embedder = new OllamaEmbeddingFunction({
        model: EMBEDDING_MODEL,
        url: "http://localhost:11434",
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
      limit: z.number().optional().describe("반환할 결과 수. (기본값: 10)"),
      filename: z.string().optional().describe("기본값: undefined"),
    }),
  }
);

// 의사결정 및 도구 사용 노드 (qwen3 1.7b 모델 사용)
async function decisionAndToolsNode(state: typeof MessagesAnnotation.State) {
  console.log("🤔 의사결정 및 도구 사용 노드 시작");

  const qwenModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: MODEL_NAME,
    streaming: false,
  });

  // 도구를 바인딩한 모델
  const modelWithTools = qwenModel.bindTools([pdfSearchTool]);

  // 마지막 사용자 메시지 찾기
  const lastUserMessage = state.messages
    .slice()
    .reverse()
    .find((msg) => msg._getType() === "human");

  const userInput = lastUserMessage?.content || "";

  // 의사결정 프롬프트
  const decisionPrompt = `사용자의 질문을 분석하여 PDF 검색이 필요한지 판단하세요.

사용자 질문: ${userInput}

PDF 검색이 불필요한 경우 (NO):
- 단순 인사 ("안녕", "고마워", "잘가")
- 감정 표현 ("좋아", "싫어", "재미있어")
- 시스템 명령 ("도움말", "종료", "리셋")

PDF 검색이 필요한 경우 (YES):
- 사용자가 질문을 하는 경우를 포함한 대부분의 경우.

주의: 모호한 경우에는 PDF 검색을 시도해보세요 (YES).

다음 중 하나로만 응답하세요:
- "YES"
- "NO"

응답:`;

  const decisionResponse = await qwenModel.invoke([
    new HumanMessage(decisionPrompt),
  ]);
  const decision = decisionResponse.content.toString().trim().toUpperCase();

  console.log("📋 의사결정 결과:", decision, decision.endsWith("YES"));

  if (decision.endsWith("YES")) {
    // PDF 검색이 필요한 경우, 도구를 사용하여 검색
    console.log("🔍 PDF 검색 실행");
    try {
      const toolResponse = await modelWithTools.invoke([
        new HumanMessage(`다음 질문에 대해 PDF를 검색하세요: ${userInput}`),
      ]);

      // 도구 호출이 있는지 확인
      if (toolResponse.tool_calls && toolResponse.tool_calls.length > 0) {
        const toolCall = toolResponse.tool_calls[0];

        // toolCall.args가 이미 객체인지 문자열인지 확인
        let args;
        if (typeof toolCall.args === "string") {
          args = JSON.parse(toolCall.args);
        } else {
          args = toolCall.args;
        }

        const searchResult = await pdfSearchTool.invoke(args);

        // 검색 결과를 메시지에 추가
        return {
          messages: [
            new AIMessage({
              content: `PDF 검색 결과를 찾았습니다. 이제 최종 응답을 생성하겠습니다.`,
              tool_calls: toolResponse.tool_calls,
            }),
            new AIMessage({
              content: `PDF 검색 결과: ${String(searchResult)}`,
              name: "pdf_search_results",
            }),
          ],
        };
      }
    } catch (error) {
      console.error("PDF 검색 중 오류:", error);
      return {
        messages: [
          new AIMessage({
            content:
              "PDF 검색 중 오류가 발생했습니다. 일반적인 응답을 생성하겠습니다.",
          }),
        ],
      };
    }
  }

  // PDF 검색이 불필요한 경우 또는 검색 실패 시
  return {
    messages: [
      new AIMessage({
        content:
          "PDF 검색이 필요하지 않습니다. 일반적인 응답을 생성하겠습니다.",
      }),
    ],
  };
}

// 최종 응답 생성 노드 (hyperclovaxseed 모델 사용)
async function responseNode(state: typeof MessagesAnnotation.State) {
  console.log("💬 최종 응답 생성 노드 시작");

  const chatModel = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: CHAT_MODEL,
    streaming: false,
  });

  // 마지막 사용자 메시지 찾기
  const lastUserMessage = state.messages
    .slice()
    .reverse()
    .find((msg) => msg._getType() === "human");

  const userInput = lastUserMessage?.content || "";

  // PDF 검색 결과가 있는지 확인
  const pdfResults = state.messages
    .slice()
    .reverse()
    .find((msg) => msg.name === "pdf_search_results");

  let prompt = `사용자에게 한국어로 친절하고 정확하게 답변하세요.

사용자 질문: ${userInput}`;

  if (pdfResults) {
    prompt += `

PDF 검색 결과:
${pdfResults.content}

위 검색 결과를 바탕으로 사용자의 질문에 답변하세요. 검색 결과가 없다면 그 사실을 명시하고 일반적인 답변을 제공하세요.`;
  } else {
    prompt += `

PDF 검색이 필요하지 않은 질문입니다. 일반적인 대화나 인사에 적절히 응답하세요.`;
  }

  const response = await chatModel.invoke([new HumanMessage(prompt)]);

  console.log("✅ 최종 응답 생성 완료");

  return {
    messages: [response],
  };
}

// 다음 단계 결정 함수
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // PDF 검색 결과가 있으면 최종 응답 생성으로
  if (lastMessage.name === "pdf_search_results") {
    return "response";
  }

  // 도구 호출이 있으면 도구 실행 후 다시 의사결정
  if (lastMessage.tool_calls?.length) {
    return "decision_and_tools";
  }

  // 그 외의 경우 최종 응답 생성으로
  return "response";
}

// 랭그래프 워크플로우 생성
function createWorkflow() {
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("decision_and_tools", decisionAndToolsNode)
    .addNode("response", responseNode)
    .addEdge("__start__", "decision_and_tools")
    .addConditionalEdges("decision_and_tools", shouldContinue)
    .addEdge("response", END);

  return workflow.compile();
}

// 워크플로우 인스턴스
const workflow = createWorkflow();

// 대화 기록
let messages: BaseMessage[] = [];

export async function POST(request: NextRequest) {
  try {
    const { userInput } = await request.json();

    if (!userInput || userInput === "exit") {
      return NextResponse.json({
        message: "대화가 종료되었습니다.",
        aiResponse: null,
      });
    }

    // 모든 모델 체크
    await ensureModelExists(MODEL_NAME);
    await ensureModelExists(EMBEDDING_MODEL);
    await ensureModelExists(CHAT_MODEL);

    console.log("🚀 랭그래프 워크플로우 시작");

    // 사용자 메시지 추가
    messages.push(new HumanMessage({ content: userInput }));

    // 워크플로우 실행
    const result = await workflow.invoke({
      messages: messages,
    });

    // 마지막 AI 메시지 찾기
    const lastAIMessage = result.messages
      .slice()
      .reverse()
      .find((msg) => msg._getType() === "ai" && !msg.name);

    const aiResponse = lastAIMessage?.content || "응답을 생성할 수 없습니다.";

    // 대화 기록 업데이트
    messages = result.messages;

    console.log("✅ 워크플로우 완료");

    return NextResponse.json({
      message: "RAG 에이전트 응답입니다.",
      aiResponse: aiResponse,
      shouldSearchPDF: result.messages.some(
        (msg) => msg.name === "pdf_search_results"
      ),
      pdfResults: result.messages.find(
        (msg) => msg.name === "pdf_search_results"
      )?.content,
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
    messages = [];

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
        name: msg.name,
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
    // 모든 모델 체크
    await ensureModelExists(MODEL_NAME);
    await ensureModelExists(EMBEDDING_MODEL);
    await ensureModelExists(CHAT_MODEL);

    return NextResponse.json({
      message: "RAG 모델이 준비되었습니다.",
      decisionModel: MODEL_NAME,
      embeddingModel: EMBEDDING_MODEL,
      chatModel: CHAT_MODEL,
    });
  } catch (error) {
    console.error("모델 초기화 에러:", error);
    return NextResponse.json(
      { error: "모델 초기화 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
