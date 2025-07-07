import { HumanMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { MessagesAnnotationWithToolCalls } from "./MessagesAnnotationWithToolCalls";
export const DECISION_MODEL_NAME = "qwen3:1.7b";

// 의사결정 노드: 도구 필요 여부만 판단
export async function decisionNode(
  state: typeof MessagesAnnotationWithToolCalls.State
) {
  console.log("🤔 의사결정 노드 시작");
  const toolCalls = [];

  if (!state.tools_checked) {
    const qwenModel = new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: DECISION_MODEL_NAME,
      streaming: false,
    });

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
      // 도구 호출 정보만 추가
      toolCalls.push({
        name: "pdf_search",
        args: { userInput },
      });
    }
  }

  return {
    ...state,
    tools_checked: true,
    tool_calls: toolCalls,
  };
}
