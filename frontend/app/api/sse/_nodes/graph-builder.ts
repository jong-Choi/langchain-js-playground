import {
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { AppState } from "./graph-state";
import {
  supervisorDecideNode,
  englishTranslatorNode,
  koreanTranslatorNode,
  chineseTranslatorNode,
  finishAndEmitNode,
} from "./graph-nodes";

// 번역 워크플로우 그래프 생성
export function createTranslationGraph() {
  return new StateGraph(AppState)
    // 노드 추가
    .addNode("supervisor_decide", supervisorDecideNode)
    .addNode("english", englishTranslatorNode)
    .addNode("korean", koreanTranslatorNode)
    .addNode("chinese", chineseTranslatorNode)
    .addNode("finish", finishAndEmitNode)
    // 엣지 연결
    .addEdge(START, "supervisor_decide")
    .addConditionalEdges("supervisor_decide", (state) => state.langs, {
      english: "english",
      korean: "korean",
      chinese: "chinese",
    })
    .addEdge(["english", "korean", "chinese"], "finish")
    .addEdge("finish", END)
    .compile();
}

// 컴파일된 번역 그래프 인스턴스
export const translationGraph = createTranslationGraph();