import { NextRequest, NextResponse } from "next/server";
import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { ensureModelExists } from "./_tools/utils";
import { DECISION_MODEL_NAME } from "./_nodes/DecisionNode";
import { CHAT_MODEL, responseNode } from "./_nodes/ResponseNode";
import { decisionNode } from "./_nodes/DecisionNode";
import { toolsNode } from "./_nodes/ToolsNode";
import { MessagesAnnotationWithToolCalls } from "./_nodes/MessagesAnnotationWithToolCalls";
import { shouldContinue } from "./_nodes/ShouldContinue";

// 랭그래프 워크플로우 생성
function createWorkflow() {
  const graph = new StateGraph(MessagesAnnotationWithToolCalls)
    .addNode("decision", decisionNode)
    .addNode("response", responseNode)
    .addNode("tools", toolsNode)
    .addEdge(START, "decision")
    .addConditionalEdges("decision", shouldContinue)
    .addEdge("tools", "decision")
    .addEdge("response", END);

  return graph.compile();
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
    await ensureModelExists(DECISION_MODEL_NAME);
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
    await ensureModelExists(CHAT_MODEL);

    return NextResponse.json({
      message: "RAG 모델이 준비되었습니다.",
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
