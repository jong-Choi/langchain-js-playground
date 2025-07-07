import { AIMessage } from "@langchain/core/messages";
import { pdfSearchTool } from "../_tools/PDFSearchTool";
import { MessagesAnnotationWithToolCalls } from "./MessagesAnnotationWithToolCalls";

// 도구 실행 노드: tool_calls에 따라 실제 도구 실행
export async function toolsNode(
  state: typeof MessagesAnnotationWithToolCalls.State
) {
  console.log("🛠️ 도구 실행 노드 시작");

  const toolCalls = state.tool_calls || [];
  const messages = state.messages ? [...state.messages] : [];

  for (const toolCall of toolCalls) {
    if (toolCall.name === "pdf_search") {
      try {
        const searchResult = await pdfSearchTool.invoke({
          query: [toolCall.args.userInput],
        });
        messages.push(
          new AIMessage({
            content: `PDF 검색 결과: ${String(searchResult)}`,
            name: "pdf_search_results",
          })
        );
      } catch {
        messages.push(
          new AIMessage({
            content: "PDF 검색 중 오류가 발생했습니다.",
            name: "pdf_search_error",
          })
        );
      }
    }
  }

  // tool_calls를 비워서 반환
  return {
    ...state,
    messages,
    tool_calls: [],
  };
}
