import {
  Annotation,
  MessagesAnnotation,
} from "@langchain/langgraph";

export const AppState = Annotation.Root({
  messages: MessagesAnnotation.spec.messages,
  langs: Annotation<string[]>({
    value: (_prev, next) => next,
    default: () => [],
  }),
  translations: Annotation<Record<string, string>>({
    value: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
});