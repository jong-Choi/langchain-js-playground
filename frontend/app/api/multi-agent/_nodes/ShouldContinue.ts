import { MessagesAnnotationWithToolCalls } from "./MessagesAnnotationWithToolCalls";

// 다음 단계 결정 함수
export function shouldContinue(
  state: typeof MessagesAnnotationWithToolCalls.State
) {
  // 도구 호출이 있으면 도구 실행 후 다시 의사결정
  if (state.tool_calls.length) {
    return "tools";
  }

  return "response";
}
