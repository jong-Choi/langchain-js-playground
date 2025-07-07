import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const MessagesAnnotationWithToolCalls = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: messagesStateReducer, // MessagesAnnotation과 동일
  }),
  tool_calls: Annotation<{ name: string; args: { userInput: string } }[]>({
    default: () => [],
    reducer: (_, next) => next, // 항상 덮어쓰기
  }),
  tools_checked: Annotation<boolean>({
    default: () => false,
    reducer: (_, next) => next, // 항상 덮어쓰기
  }),
});
