# 제목

멀티 에이전트 번역 챗봇(영·한·중) — LangGraph + ChatOllama 설계/요구사항

- 수퍼바이저가 결정 -> 멀티 에이전트 호출 -> 각 멀티 에이전트에서 streamEvents로 응답 생성 -> 멀티 에이전트들 호출 종료되면 작업 종료 이벤트와 함께 끝. 모든 에이전트 모델은

```
  new ChatOllama({
  baseUrl: `${process.env.ORACLE_OLLAMA_HOST}`,
  model: DECISION_MODEL_NAME,
  streaming: true,
  });
```

# 서론

LangGraph의 Supervisor 패턴을 이용해 사용자의 입력을 분석한 뒤, 영어·한국어·중국어 번역 전용 에이전트를 병렬 호출하고, 각 에이전트의 토큰을 `streamEvents`로 스트리밍한 다음 모든 작업이 끝나면 “작업 종료” 커스텀 이벤트를 내보내는 구조를 정의한다. Supervisor와 각 에이전트는 LangChain.js의 `@langchain/ollama` ChatOllama를 사용한다. ([langchain-ai.github.io][1], [js.langchain.com][2])

---

## 1) 시스템 목표(Functional)

- 입력 1회에 대해 다음 파이프라인을 1회 실행

  - Supervisor가 번역 대상 언어 배열을 결정
  - 결정된 언어별 번역 에이전트 병렬 실행
  - 각 에이전트에서 토큰 스트리밍(`.streamEvents`)
  - 모든 에이전트 종료 시 집계 → 종료 이벤트(`task_completed`) 디스패치 ([langchain-ai.github.io][1])

- Supervisor 출력 스키마: `Array<"english" | "korean" | "chinese">`

  - 주의: `"chineses"`는 오타. 정확한 값은 `"chinese"`.

- 에이전트 출력: `{ translations: { english?: string; korean?: string; chinese?: string } }`

## 2) 비기능(Non-Functional)

- JS/TS 런타임, LangGraph.js 사용
- 스트리밍: 토큰/이벤트 모두 지원(LLM 토큰, 커스텀 이벤트) ([langchain-ai.github.io][3])
- 병렬 실행 후 팬-인(모두 완료 시 집계 노드 1회 실행) ([langchain-ai.github.io][4])
- 모델: 로컬/원격 Ollama 엔드포인트 사용(`baseUrl`로 지정) ([js.langchain.com][2])

---

## 3) 내부 동작 트리(아키텍처 개요)

```
START
 └─[supervisor_decide]
     └─ addConditionalEdges(decision[])  ─┬─> [agent_english] ─┐
                                           ├─> [agent_korean]  ├─> [finish_and_emit_task_completed] ─> END
                                           └─> [agent_chinese] ─┘
```

- `supervisor_decide` → 반환값(배열)에 따라 대상 노드들을 “병렬” 팬-아웃
- `finish_and_emit_task_completed`는 세(혹은 일부) 번역 노드가 모두 끝나면 1회 실행(팬-인) ([langchain-ai.github.io][5])

---

## 4) 프롬프트 엔지니어링

### 4.1 Supervisor 시스템 프롬프트(정확 출력 강제)

```text
역할: 번역 작업 슈퍼바이저
목표: 사용자 입력을 분석하여 필요한 번역 타깃 언어를 선택한다.

응답 형식:
- 반드시 JSON이 아닌 "텍스트 단일 라인"으로만,
- 정확히 다음 타입의 배열만 출력:
  Array<"english" | "korean" | "chinese">
- 그 외 설명/부가 텍스트 금지.

선택 규칙:
- 사용자가 특정 언어를 지정하면 해당 언어만 선택.
- 다수 언어 지정 시 지정된 언어만 포함.
- 지정이 없으면 ["english"] 기본값.
- 중국어는 간체 기준으로 "chinese"만 사용.

예시 입력/출력:
- 입력: "중국어랑 영어로 번역" → 출력: ["chinese","english"]
- 입력: "한국어로만" → 출력: ["korean"]
- 입력: "그냥 번역해줘" → 출력: ["english"]
```

> 모델 예시(사용자가 지정):
>
> ```ts
> new ChatOllama({
>   baseUrl: `${process.env.ORACLE_OLLAMA_HOST}`,
>   model: DECISION_MODEL_NAME,
>   streaming: true,
> });
> ```
>
> ChatOllama는 `@langchain/ollama` 패키지이며 스트리밍 메서드는 `.stream`/`.streamEvents`로 호출한다. ([js.langchain.com][2], [api.js.langchain.com][6])

### 4.2 번역 에이전트(언어별 동일 골격, 언어만 다름)

#### 공통 시스템 프롬프트

```text
역할: 단일 언어 번역기
지침:
- 입력의 의미·용어·숫자·코드 블록을 보존하되 대상 언어로 자연스럽고 정확하게 번역.
- 출력은 번역문 "한 줄"만. 접두사/설명/메타데이터 금지.
- 형식화된 코드/마크다운/URL 유지.
- 고유명사는 대상 언어 관례에 맞추어 표기(존재 시).
- 중복 공백 제거.
```

#### 영어 에이전트(User → English)

```text
대상 언어: English
출력: 영어 번역문만 한 줄
금지: 원문 반복, 추가 설명
```

#### 한국어 에이전트(User → Korean)

```text
대상 언어: Korean
출력: 한국어 번역문만 한 줄
금지: 원문 반복, 추가 설명
```

#### 중국어 에이전트(User → Chinese)

```text
대상 언어: Chinese (Simplified)
출력: 중국어(간체) 번역문만 한 줄
금지: 원문 반복, 추가 설명
```

---

## 5) 타입/상태/그래프 정의(코드 스니펫, TypeScript)

### 5.1 의존성

```bash
pnpm add @langchain/langgraph @langchain/core @langchain/ollama zod
```

### 5.2 상태(Annotation 또는 Zod 사용)

```ts
import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
  Annotation,
} from "@langchain/langgraph";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// messages 채널 + 커스텀 채널(결정, 번역 결과)
const AppState = Annotation.Root({
  messages: MessagesAnnotation.spec.messages, // 대화(옵션)
  langs: Annotation<string[]>({ default: () => [] }), // supervisor 결정
  translations: Annotation<Record<string, string>>({
    // 집계 결과
    default: () => ({}),
  }),
});
```

`MessagesAnnotation`은 메시지 채널을 위한 프리셋(합치기 리듀서 포함)이다. ([langchain-ai.github.io][7])

### 5.3 모델 & 체인

```ts
const DECISION_MODEL_NAME = process.env.DECISION_MODEL_NAME!;
const TRANSLATION_MODEL_NAME = process.env.TRANSLATION_MODEL_NAME!;

const mkOllama = (model: string) =>
  new ChatOllama({ baseUrl: process.env.ORACLE_OLLAMA_HOST, model });

/** supervisor: 구조화 출력 = string literal union array */
const decideSchema = z.array(z.enum(["english", "korean", "chinese"]));
const supervisorLLM = mkOllama(DECISION_MODEL_NAME).withStructuredOutput(
  decideSchema,
  {
    name: "decide_languages",
  }
);
const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ["system", /* 위 4.1 프롬프트 본문 문자열 */ ""],
  ["user", "{input}"],
]);
const supervisor = supervisorPrompt.pipe(supervisorLLM);

/** 번역 에이전트: 언어별 체인 */
const agentPrompt = (sys: string) =>
  ChatPromptTemplate.fromMessages([
    ["system", sys],
    ["user", "{input}"],
  ]);

const enAgent = agentPrompt(/* 4.2 영어 프롬프트 */ "").pipe(
  mkOllama(TRANSLATION_MODEL_NAME)
);
const koAgent = agentPrompt(/* 4.2 한국어 프롬프트 */ "").pipe(
  mkOllama(TRANSLATION_MODEL_NAME)
);
const zhAgent = agentPrompt(/* 4.2 중국어 프롬프트 */ "").pipe(
  mkOllama(TRANSLATION_MODEL_NAME)
);
```

ChatOllama 통합과 스트리밍 가능 메서드는 공식 문서 기준이다. ([js.langchain.com][2], [api.js.langchain.com][6])

### 5.4 노드 정의

```ts
// 1) 결정 노드
const supervisor_decide = async (s: typeof AppState.State) => {
  const langs = await supervisor.invoke({
    input: s.messages?.at(-1)?.content ?? "",
  });
  return { langs };
};

// 2) 번역 노드들
const agent_english = async (s: typeof AppState.State) => {
  const out = await enAgent.invoke({
    input: s.messages?.at(-1)?.content ?? "",
  });
  return {
    translations: { ...s.translations, english: out.content as string },
  };
};
const agent_korean = async (s: typeof AppState.State) => {
  const out = await koAgent.invoke({
    input: s.messages?.at(-1)?.content ?? "",
  });
  return { translations: { ...s.translations, korean: out.content as string } };
};
const agent_chinese = async (s: typeof AppState.State) => {
  const out = await zhAgent.invoke({
    input: s.messages?.at(-1)?.content ?? "",
  });
  return {
    translations: { ...s.translations, chinese: out.content as string },
  };
};

// 3) 집계/종료 노드(커스텀 이벤트)
const finish_and_emit_task_completed = async (s: typeof AppState.State) => {
  await dispatchCustomEvent("task_completed", { translations: s.translations });
  return s; // 최종 상태 그대로 반환
};
```

커스텀 이벤트 디스패치는 `dispatchCustomEvent`로 가능하며 `.streamEvents`에서 수신된다. ([langchain-ai.github.io][8])

### 5.5 그래프 조립(조건 분기 + 병렬 + 팬-인)

```ts
const graph = new StateGraph(AppState)
  .addNode("supervisor_decide", supervisor_decide)
  .addNode("english", agent_english)
  .addNode("korean", agent_korean)
  .addNode("chinese", agent_chinese)
  .addNode("finish", finish_and_emit_task_completed)
  .addEdge(START, "supervisor_decide")
  // 결정 결과에 따라 병렬 분기: 반환값이 ["english","korean"]이면 두 노드 병렬 실행
  .addConditionalEdges("supervisor_decide", (s) => s.langs, {
    english: "english",
    korean: "korean",
    chinese: "chinese",
  })
  // 세(혹은 일부) 번역 노드가 모두 끝나면 집계 노드 1회 실행
  .addEdge(["english", "korean", "chinese"], "finish")
  .addEdge("finish", END)
  .compile();
```

- `addConditionalEdges`는 라우팅 함수의 결과로 노드 이름(또는 배열)을 받아 병렬 팬-아웃을 만든다.
- `addEdge`에 복수 시작 노드를 넘기면 “모두 완료 시” 다음 노드가 실행된다(팬-인). ([langchain-ai.github.io][5])

---

## 6) 실행 & 스트리밍 수신

### 6.1 이벤트 스트리밍(토큰/이벤트)

```ts
// 입력
const inputs = [
  {
    role: "user",
    content: "다음 문장을 영어·한국어·중국어로 번역:\n오늘은 금요일이다.",
  },
];

// v2 이벤트 스트림 구독
for await (const ev of graph.streamEvents(
  { messages: inputs },
  { version: "v2" }
)) {
  // 토큰 스트림 예: on_chat_model_stream (어떤 노드에서 발생했는지 메타데이터 포함)
  if (ev.event === "on_chat_model_stream") {
    const node = ev.metadata?.langgraph_node; // "english"/"korean"/"chinese" 등
    const chunk = ev.data?.chunk?.content ?? "";
    // 클라이언트 UI에 노드별 스트림으로 표시
  }
  // 커스텀 종료 이벤트
  if (ev.event === "on_custom_event" && ev.name === "task_completed") {
    const payload = ev.data; // { translations: { ... } }
    // 최종 결과 렌더 & 스트림 종료 처리
  }
}
```

`.streamEvents({ version: "v2" })`는 그래프/노드/LLM 토큰 이벤트를 표준화된 형태로 방출하며, `dispatchCustomEvent`로 보낸 이벤트도 함께 방출된다. ([langchain-ai.github.io][3])

---

## 7) I/O 규약

- 입력: `messages: BaseMessage[]`(`[{ role:"user", content:string }]` 최소)
- Supervisor 출력: `langs: Array<"english"|"korean"|"chinese">`
- 최종 출력: `translations` 객체(존재하는 키만 포함)

---

## 8) 예시 시나리오(요청된 “예시 1/2/3”)

1. 입력: `“한국어만 번역해”`

   - Supervisor 출력: `["korean"]`
   - 실행 노드: `korean` → `finish`
   - 종료 이벤트: `task_completed`(translations.korean 존재)

2. 입력: `“영어/중국어로 둘 다”`

   - Supervisor 출력: `["english","chinese"]`
   - 실행 노드: `english` + `chinese` 병렬 → 팬-인 `finish`
   - 종료 이벤트: `task_completed`(translations.english, translations.chinese 존재)

3. 입력: `“세 언어 모두”`

   - Supervisor 출력: `["english","korean","chinese"]`
   - 실행 노드: 세 노드 병렬 → 팬-인 `finish`
   - 종료 이벤트: `task_completed`(세 키 존재)

---

## 9) 에러/엣지 케이스

- Supervisor가 빈 배열 반환 시: 기본값 `["english"]` 적용(프롬프트 규칙).
- 번역 노드 중 일부 실패: 재시도 후 실패한 키만 제외하고 `finish`에서 존재하는 번역만 집계(클라이언트는 누락 키 처리).
- 그래프가 조기 종료되는 루트(조건 미매핑 등) 방지: `addConditionalEdges` 매핑 키와 노드명을 동일하게 유지.

---

## 10) 참고(핵심 문서 근거)

- Supervisor 멀티에이전트 패턴 개요/구현 예시(핸드오프·감독 구조) ([langchain-ai.github.io][1])
- LangGraph.js 스트리밍 개념 및 `.streamEvents` v2 사용법(LLM 토큰/메타데이터) ([langchain-ai.github.io][3])
- 커스텀 이벤트 스트리밍(`dispatchCustomEvent` → `on_custom_event`) ([langchain-ai.github.io][8])
- 조건 분기/병렬·팬-인 모델링(`addConditionalEdges`, 다중 시작노드의 팬-인) ([langchain-ai.github.io][5])
- ChatOllama 통합/설치/스트리밍 메서드 및 `baseUrl`/모델 지정 예시 ([js.langchain.com][2], [api.js.langchain.com][6])

---

# 결론

Supervisor가 언어 배열을 결정하고 조건 분기로 번역 에이전트를 병렬 실행, `streamEvents`로 노드별 토큰을 실시간 전송, 팬-인으로 집계 후 커스텀 종료 이벤트를 방출하는 설계를 제시했다. 모든 구성은 LangGraph.js의 공식 스트리밍·분기 API와 `@langchain/ollama` ChatOllama 통합 문서를 근거로 하며, 정확한 프롬프트와 타입 스키마로 일관된 동작을 보장한다. ([langchain-ai.github.io][3], [js.langchain.com][2])

[1]: https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/ "Agent Supervisor"
[2]: https://js.langchain.com/docs/integrations/chat/ollama/ "ChatOllama | ️ Langchain"
[3]: https://langchain-ai.github.io/langgraphjs/concepts/streaming/ "Streaming"
[4]: https://langchain-ai.github.io/langgraphjs/how-tos/branching/?utm_source=chatgpt.com "How to create branches for parallel node execution"
[5]: https://langchain-ai.github.io/langgraphjs/concepts/low_level/?utm_source=chatgpt.com "LangGraph Glossary"
[6]: https://api.js.langchain.com/classes/langchain_ollama.ChatOllama.html "ChatOllama | LangChain.js"
[7]: https://langchain-ai.github.io/langgraphjs/reference/variables/langgraph.MessagesAnnotation.html?utm_source=chatgpt.com "Variable MessagesAnnotation Const - API Reference"
[8]: https://langchain-ai.github.io/langgraphjs/how-tos/streaming-content/ "How to stream custom data"
