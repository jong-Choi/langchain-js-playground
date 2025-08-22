### SSE 멀티에이전트 번역 서버: 개발 가이드/how-to

이 문서는 `app/api/sse/route.ts`가 어떻게 동작하는지, 그래프 구조, 이벤트 스트리밍 규약, 모델/환경변수 설정, 확장 방법, 트러블슈팅 팁을 정리합니다.

### 핵심 개요

- **Supervisor(결정)**: 사용자 입력에서 번역 대상 언어 배열을 결정(영/한/중). 모델: `MODEL_NAME`.
- **Translator Agents(실행)**: 언어별 번역 전용 에이전트 3개(영/한/중). 모델: `TRANSLATOR_MODEL_NAME`.
- **Streaming**: LangGraph `.streamEvents({ version: "v2" })` → 서버에서 SSE로 변환하여 클라이언트 전송.
- **Fan-out/Fan-in**: Supervisor가 선택한 언어별 노드로 병렬 분기 → 모두 완료 시 `finish` 노드 1회 실행(커스텀 종료 이벤트 디스패치).
- **No back-to-supervisor**: 번역 에이전트 종료 후 슈퍼바이저로 되돌아가지 않음. `finish` → `END`로 종료.

### 그래프 구조(ASCII)

```
START
 └─ supervisor_decide
     └─ addConditionalEdges(langs[]) ─┬─> english
                                      ├─> korean
                                      └─> chinese
                             fan-in ────────────────> finish ─> END
```

### 이벤트 흐름

- 서버는 다음 타입의 SSE 이벤트를 `data: {json}` 라인으로 전송합니다.
  - `start`: 작업 시작 알림
  - `agent_start`: 노드(슈퍼바이저/번역 에이전트) 시작
  - `chunk`: 토큰/텍스트 청크 스트리밍
  - `agent_end`: 노드 종료(선택적으로 최종 텍스트 포함)
  - `final`: 최종 번역 집계 결과(JSON 문자열) + 입력 메시지
  - `end`: 전체 작업 종료
  - `error`: 오류 알림

### 파일 구조 요약

- `app/api/sse/route.ts`: 서버 라우트(그래프 정의 + SSE 변환 + 이벤트 송신)
- `app/sse/page.tsx`: 클라이언트(이벤트 수신 및 UI 반영)
- `app/api/sse/README.md`: 설계/요구사항 문서
- `app/api/sse/how-to.md`: 본 문서(개발자용 가이드)

### route.ts 동작 원리(상세)

1. 모델 헬퍼 및 상수

- `mkOllama(model)`: `ChatOllama` 인스턴스를 생성(`baseUrl`, `model`, `streaming: true`).
- `MODEL_NAME`: 슈퍼바이저용 모델.
- `TRANSLATOR_MODEL_NAME`: 번역 에이전트용 모델(툴 콜링을 쓰지 않는 순수 LLM 체인).

2. Supervisor(결정)

- Prompt: 언어 배열만 텍스트로 출력하도록 지시.
- 우선 `withStructuredOutput(z.array(z.enum([...]))`로 시도하고, 실패 시 텍스트 기반 폴백 파서가 문자열/객체/의도치 않은 포맷에서도 언어를 안전 추출.
- 결과: `langs: ("english"|"korean"|"chinese")[]`.

3. 번역 에이전트(실행)

- 언어별 동일한 시스템 프롬프트 골격(대상 언어만 변경).
- `ChatPromptTemplate → ChatOllama(TRANSLATOR_MODEL_NAME)` 파이프라인. 구조화 출력/툴콜 미사용(프롬프트로 막는 게 아니라 노드 자체가 툴콜을 쓰지 않도록 구성).

4. 그래프 조립

- `addConditionalEdges("supervisor_decide", (s) => s.langs, { english: "english", korean: "korean", chinese: "chinese" })`로 병렬 분기.
- 모든 번역 노드 종료 시 `finish`를 1회 실행 → `dispatchCustomEvent("task_completed", { translations })` → `END`.
- 설계상 번역 노드 완료 후 슈퍼바이저로 되돌아갈 간선이 없음.

5. SSE 변환

- `for await (const ev of graph.streamEvents(..., { version: "v2" }))`를 순회하며 LangGraph 이벤트를 SSE 포맷으로 매핑.
- 토큰 스트림은 `on_chat_model_stream`의 `chunk.content`를 `chunk` 이벤트로 전송.
- `on_custom_event(name === "task_completed")` 수신 시 `final` 이벤트로 번역 결과(문자열화)를 전송.

### 환경변수

- `ORACLE_OLLAMA_HOST`: Ollama 서버 URL(예: `http://localhost:11434`).
- `TRANSLATOR_MODEL_NAME`: 번역 에이전트 모델 이름. 지정 없으면 코드 기본값 사용.

### 개발 방법(확장/변경)

- 언어 추가
  1. 프롬프트 상수 추가(예: `JA_AGENT_PROMPT`).
  2. `agentPrompt(JA_AGENT_PROMPT).pipe(mkOllama(TRANSLATOR_MODEL_NAME))`로 체인 생성.
  3. `AppState.translations` 머지 로직에 새 키 추가.
  4. `addConditionalEdges` 매핑과 `addEdge([...], "finish")`의 시작 집합에 노드 추가.
  5. 클라이언트 UI가 새 키를 표시하도록 조정.
- 모델 교체
  - 슈퍼바이저: `MODEL_NAME` 변경.
  - 번역 에이전트: `TRANSLATOR_MODEL_NAME` 환경변수 또는 코드 기본값 변경.
- 이벤트 스키마 변경
  - 서버: `toLine({ type, data })` 페이로드를 수정.
  - 클라이언트: `handleSSEEvent` 스위치를 동일하게 수정.

### 트러블슈팅

- Supervisor 출력 파싱 실패
  - 구조화 출력 실패 시 폴백 파서가 문자열/객체(툴콜 형식 포함)에서 언어를 추출합니다.
  - 여전히 추출 실패 시 기본값 `['english']`가 적용됩니다.
- 토큰 스트림 무응답
  - Ollama 서버 주소/모델명 확인.
  - 방화벽/프록시가 SSE 응답을 차단하지 않는지 확인.
- Lint/Build 실패
  - 본 라우트는 린트 에러 없이 동작하도록 강타입 처리되어 있습니다. 워크스페이스의 다른 파일 에러는 별도 해결이 필요합니다.

### 빠른 체크리스트

- 번역 노드 완료 후 슈퍼바이저로 되돌아가지 않는가? → 예, `finish → END`로 종료.
- 번역 에이전트가 툴 콜링을 사용하지 않는가? → 예, 순수 LLM 체인.
- 이벤트 타입이 프론트와 합의되었는가? → 예, `start|agent_start|chunk|agent_end|final|end|error`.
