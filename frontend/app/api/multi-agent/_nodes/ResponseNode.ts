import { HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { fetchWithSecretKey } from "../_tools/utils";
// export const CHAT_MODEL =
//   "hf.co/cherryDavid/HyperCLOVA-X-SEED-Vision-Instruct-3B-Llamafied-Q4_K_S-GGUF:latest";
export const CHAT_MODEL = "exaone3.5:2.4b";

// 최종 응답 생성 노드 (hyperclovaxseed 모델 사용)
export async function responseNode(state: typeof MessagesAnnotation.State) {
  console.log("💬 최종 응답 생성 노드 시작");

  const chatModel = new ChatOllama({
    baseUrl: `${process.env.ORACLE_OLLAMA_HOST}`,
    model: CHAT_MODEL,
    streaming: false,
    fetch: fetchWithSecretKey,
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
