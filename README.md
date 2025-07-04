# langchain-js-playground

## 참조 사이트
[Building an AI Assistant with Ollama and Next.js – Part 3 (RAG with LangChain, Pinecone and Ollama)](https://dev.to/abayomijohn273/building-an-ai-assistant-with-ollama-and-nextjs-part-3-rag-with-langchain-pinecone-and-ollama-dja)
[llama.cpp로 gguf 모델 서빙하기](https://velog.io/@choonsik_mom/llama.cpp%EB%A1%9C-gguf-%EB%AA%A8%EB%8D%B8-%EC%84%9C%EB%B9%99%ED%95%98%EA%B8%B0-ul02hone)
[rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF](https://huggingface.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF)


## Ollama 설치
1. https://ollama.com/download
해당 페이지에서 운영체제에 맞는 ollama를 설치한다.

2. `ollama run hf.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF:Q4_K_M`
터미널에서 해당 명령어를 입력하여 [rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF](https://huggingface.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF)를 설치하고 실행한다. 
- gguf : llama.cpp에서 실행할 수 있는 인공지능 모델 확장자
- q4_k : 양자화의 정도를 나타내는 말. 32비트 실수를 4비트로 양자화함을 의미한다. 32비트를 4비트로 블록화하여 근사치만으로 이용하므로 메모리 사용량이 크게 줄어든다.
네이버의 하이퍼클로바seed 모델을 LLAMA.cpp로 실행할 수 있는 gguf 모델이고, Q4로 양자화 되어 있다.

3. ollama로 실행된 서버의 기본 포트는 http://localhost:11434번이다. 새로운 터미널에서 아래와 같은 명령어로 실행해보자.
```
curl http://localhost:11434/api/generate \
  -d '{
    "model": "hf.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF:Q4_K_M",
    "prompt": "안녕? 넌 누구니?",
    "stream": false
  }'
```
```
{"model":"hf.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF:Q4_K_M","created_at":"2025-07-02T18:48:44.449608Z","response":"안녕하세요! 저는 인공지능 언어 모델인 CLOVA X입니다. 네이버의 초대규모(Hyperscale) 언어모델인 HyperCLOVA X 기술을 바탕으로 만들어졌으며, 사용자님께 도움이 되는 정보를 제공하고 다양한 요청을 수행하기 위해 존재합니다.\n\n저는 다음과 같은 기능을 제공할 수 있습니다.\n1. 질의응답: 사용자의 질문에 대해 답변을 제공합니다.\n2. 글쓰기: 사용자의 요청에 따라 이메일, 비즈니스 문서 등 다양한 글을 작성할 수 있습니다.\n3. 번역: 여러 언어 간의 번역을 지원하며, 정확도를 높이기 위한 연구가 계속되고 있습니다.\n4. 요약: 원문을 짧게 요약하여 제공하는 기능입니다.\n5. 일상 대화: 일상적인 주제로 대화를 진행합니다.\n\n저는 사용자님을 돕기 위해 최선을 다하겠습니다. 궁금한 점이 있으시면 언제든지 물어보세요!","done":true,"done_reason":"stop","context":[100272,882,198,103221,100889,30,66653,234,101797,84136,30,100273,198,100272,78191,198,101151,0,109176,105569,103176,110172,32428,356,1623,13114,1630,80052,13,101009,21028,105347,102788,11135,1100,388,2296,8,103176,105141,32428,33832,34,1623,13114,1630,110246,107471,104661,109547,107212,11,104658,110084,106729,104138,109115,106887,105012,106393,18359,29833,169,52375,67525,101967,3396,91657,58232,61938,382,109977,107046,109793,106487,104667,29833,101632,627,16,13,108434,21028,105777,104281,25,103441,106630,106938,105331,105874,627,17,13,107642,105370,25,103441,106393,19954,109102,105765,11,101858,100978,78102,105012,108744,108746,48936,29833,101632,627,18,13,106945,25,106402,103176,107967,85721,103953,103797,102000,11,106360,107640,104852,106944,103187,106796,20565,109104,106934,101632,627,19,13,100310,25,101769,103072,105677,58901,100310,83290,105530,102939,80052,627,20,13,102668,110185,25,102668,107510,100385,108104,106942,169,52375,61938,382,109977,104658,109334,105751,21121,101967,109856,50467,100965,13,100874,24486,108843,103323,104010,108921,101866,105929,0],"total_duration":4391004917,"load_duration":47402125,"prompt_eval_count":16,"prompt_eval_duration":136507959,"eval_count":168,"eval_duration":4206392208}%   
```


## langchain js 라이브러리 설명

LangChain.js는 JavaScript/TypeScript 환경에서 AI 애플리케이션을 구축하기 위한 프레임워크다. Python 버전의 LangChain을 JavaScript로 포팅한 것으로, LLM과의 상호작용, 프롬프트 관리, 체인 구성 등을 지원한다.

주요 특징:
- 다양한 LLM 제공자 지원 (OpenAI, Anthropic, Ollama 등)
- 프롬프트 템플릿과 체인 구성
- 메모리 관리 및 대화 기록 처리
- 도구(Tools) 및 에이전트 기능
- 벡터 스토어 통합

## ollama 라이브러리 설명

Ollama는 로컬에서 대규모 언어 모델을 실행할 수 있게 해주는 오픈소스 플랫폼이다. JavaScript 라이브러리는 Ollama 서버와 통신하여 모델 관리, 채팅, 생성 등의 기능을 제공한다.

주요 기능:
- 모델 다운로드 및 관리 (`pull`, `list`, `delete`)
- 채팅 인터페이스 (`chat`)
- 텍스트 생성 (`generate`)
- 임베딩 생성 (`embed`)
- 스트리밍 응답 지원

## langchain js와 ollama를 이용한 채팅 앱 구현하기

### langchain js 설치

```bash
npm install langchain @langchain/openai
```

### ollama 설치

```bash
npm install ollama
```

### ollama 모델 체크

하이퍼클로바엑스시드 모델이 설치되어 있는지 확인하고, 없으면 다운로드하는 함수를 구현했다.

```typescript
// 모델이 설치되어 있는지 확인하는 함수
async function ensureModelExists() {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some(model => model.name === MODEL_NAME);
    
    if (!modelExists) {
      console.log(`모델 ${MODEL_NAME}을 다운로드 중...`);
      await ollama.pull({ model: MODEL_NAME });
      console.log(`모델 ${MODEL_NAME} 다운로드 완료`);
    }
  } catch (error) {
    console.error('모델 확인/다운로드 중 에러:', error);
    throw new Error('모델을 준비할 수 없습니다.');
  }
}
```

### ollama routes handler로 채팅 기능 구현하기

Next.js App Router를 사용하여 API 엔드포인트를 구현했다.

**POST /api/chat**: 사용자 메시지를 받아 AI 응답 생성
```typescript
export async function POST(request: NextRequest) {
  try {
    const { userInput } = await request.json();
    
    // 모델 확인
    await ensureModelExists();
    
    // 사용자 메시지 추가
    messages.push({ role: "user", content: userInput });
    
    // Ollama API 호출
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: messages,
    });
    
    // AI 응답 추가
    messages.push({ role: "assistant", content: response.message.content });
    
    return NextResponse.json({
      message: "성공적으로 응답을 생성했습니다.",
      aiResponse: response.message.content,
      userInput: userInput
    });
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

**PUT /api/chat**: 모델 초기화
```typescript
export async function PUT() {
  try {
    await ensureModelExists();
    return NextResponse.json({
      message: "모델이 준비되었습니다.",
      model: MODEL_NAME
    });
  } catch (error) {
    return NextResponse.json(
      { error: '모델 초기화 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

**DELETE /api/chat**: 대화 기록 초기화
```typescript
export async function DELETE() {
  try {
    messages = [
      { role: "system", content: "너는 사용자를 도와주는 상담사야." }
    ];
    return NextResponse.json({ 
      message: "대화 기록이 초기화되었습니다." 
    });
  } catch (error) {
    return NextResponse.json(
      { error: '초기화 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

### 채팅 ui 구현

React와 TypeScript를 사용하여 실시간 채팅 인터페이스를 구현한다.

**주요 기능:**
- 실시간 메시지 전송 및 응답 표시
- 사용자/AI 메시지 구분 (색상 및 정렬)
- 로딩 상태 표시 (스피너)
- 모델 초기화 버튼
- 대화 초기화 기능
- 반응형 디자인

**핵심 컴포넌트:**
```typescript
const sendMessage = async () => {
  if (!input.trim() || isLoading) return;
  
  const userMessage = input.trim();
  setInput('');
  setIsLoading(true);
  
  // 사용자 메시지 추가
  setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: userMessage }),
    });
    
    if (!response.body) throw new Error('스트림 응답이 없습니다.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let aiMessage = '';
    setIsLoading(false);
    setMessages(prev => [...prev, { type: 'ai', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      aiMessage += chunk;
      setMessages(prev => {
        // 마지막 ai 메시지에 실시간으로 추가
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'ai') {
            updated[i] = { ...updated[i], content: aiMessage };
            break;
          }
        }
        return updated;
      });
    }
  } catch (error) {
    setMessages(prev => [...prev, { type: 'ai', content: '서버와의 통신 중 오류가 발생했습니다.' }]);
  }
};
```


## Ollama JavaScript 라이브러리 상세 사용법

### 기본 설정 및 초기화

```typescript
import ollama from 'ollama';

// 기본 클라이언트 (localhost:11434)
const client = ollama;

// 커스텀 호스트 설정
import { Ollama } from 'ollama';
const customClient = new Ollama({ 
  host: 'http://192.168.1.100:11434' 
});

// 커스텀 헤더 설정
const authClient = new Ollama({
  host: 'http://localhost:11434',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'X-Custom-Header': 'custom-value'
  }
});
```

### 모델 관리 명령어

**모델 목록 조회**
```typescript
const models = await ollama.list();
console.log(models.models); // 설치된 모델 목록
```

**모델 다운로드**
```typescript
// 기본 다운로드
await ollama.pull({ model: 'llama3.1' });

// 스트리밍 다운로드 (진행률 확인)
const stream = await ollama.pull({ 
  model: 'llama3.1', 
  stream: true 
});

for await (const part of stream) {
  console.log(`다운로드 진행률: ${part.status}`);
}
```

**모델 삭제**
```typescript
await ollama.delete({ model: 'llama3.1' });
```

**모델 복사**
```typescript
await ollama.copy({ 
  source: 'llama3.1', 
  destination: 'llama3.1-copy' 
});
```

### 채팅 기능

**기본 채팅**
```typescript
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [
    { role: 'system', content: '당신은 도움이 되는 AI 어시스턴트입니다.' },
    { role: 'user', content: '안녕하세요!' }
  ]
});

console.log(response.message.content);
```

**스트리밍 채팅**
```typescript
const stream = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: '긴 이야기를 해주세요' }],
  stream: true
});

for await (const part of stream) {
  process.stdout.write(part.message.content);
}
```

**JSON 형식 응답**
```typescript
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: '사용자 정보를 JSON으로 반환해주세요' }],
  format: 'json'
});
```

### 텍스트 생성 기능
chat과 다르게 문자열을 생성하고, 대화기록 없이 사용할 때. 
**기본 생성**
```typescript
const response = await ollama.generate({
  model: 'llama3.1',
  prompt: '다음 문장을 완성해주세요: 오늘 날씨가'
});

console.log(response.response);
```

**시스템 프롬프트 설정**
```typescript
const response = await ollama.generate({
  model: 'llama3.1',
  prompt: '사용자 질문에 답변해주세요',
  system: '당신은 전문적인 상담사입니다.'
});
```

**템플릿 사용**
```typescript
const response = await ollama.generate({
  model: 'llama3.1',
  prompt: '{{.Input}}',
  template: '다음 질문에 답변해주세요: {{.Input}}'
});
```

### 임베딩 생성

```typescript
const embeddings = await ollama.embed({
  model: 'mxbai-embed-large',
  input: 'Llamas are members of the camelid family',
});

console.log(embeddings.embeddings); // 벡터 배열
```

### 모델 정보 조회

```typescript
const modelInfo = await ollama.show({ model: 'llama3.1' });
console.log(modelInfo.parameters); // 모델 파라미터
console.log(modelInfo.template);   // 프롬프트 템플릿
console.log(modelInfo.system);     // 시스템 프롬프트
```

## 스트리밍 응답

Ollama랑 Next.js API에서 스트리밍 응답이 실제로 어떻게 동작하는지 궁금할 수 있는데, 직접 코드를 보면서 이해하면 쉽다.

### 동작 원리

1. **Ollama 스트림 생성**
   - Ollama의 chat API를 쓸 때 `stream: true` 옵션을 주면, 답변이 한 번에 쏟아지는 게 아니라 토큰(문장/단어) 단위로 조금씩 온다.
   - 이 스트림은 JavaScript의 비동기 이터러블(AsyncIterable)이라서, `for await ... of`로 한 덩어리씩 받아올 수 있다. 실제로 아래처럼 쓴다.

2. **서버에서 ReadableStream 만들기**
   - Web Streams API의 `ReadableStream`을 써서 Ollama에서 받은 데이터를 바로 클라이언트로 흘려보낸다.

   ```typescript
   const encoder = new TextEncoder();
   const readable = new ReadableStream({
     async start(controller) {
       let aiContent = '';
       for await (const part of stream) {
         if (part.message && part.message.content) {
           aiContent += part.message.content;
           controller.enqueue(encoder.encode(part.message.content));
         }
       }
       controller.close();
     }
   });
   ```

3. **클라이언트로 스트리밍 전송**
   - Next.js의 Response 객체에 위에서 만든 `readable` 스트림을 넣어서 반환하면, 브라우저는 데이터를 한 번에 다 받는 게 아니라 서버에서 보내는 대로 실시간으로 받아볼 수 있다.
   - `Transfer-Encoding: chunked` 헤더가 붙어서, 응답이 끝날 때까지 계속 데이터를 받을 수 있다.

   ```typescript
   return new Response(readable, {
     headers: {
       'Content-Type': 'text/plain; charset=utf-8',
       'Transfer-Encoding': 'chunked',
       'Cache-Control': 'no-cache',
     },
   });
   ```

4. **클라이언트에서 스트림 읽어서 실시간으로 메시지 업데이트하기**
   - 이제 프론트엔드에서 이 스트림을 받아서 한 글자씩 실시간으로 화면에 보여주면 된다. 실제로 `page.tsx`에서 아래처럼 구현한다.

   ```typescript
   const response = await fetch('/api/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userInput: userMessage }),
   });

   if (!response.body) throw new Error('스트림 응답이 없습니다.');
   const reader = response.body.getReader();
   const decoder = new TextDecoder('utf-8');
   let aiMessage = '';
   setIsLoading(false);
   setMessages(prev => [...prev, { type: 'ai', content: '' }]);

   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     const chunk = decoder.decode(value);
     aiMessage += chunk;
     setMessages(prev => {
       // 마지막 ai 메시지에 실시간으로 추가
       const updated = [...prev];
       for (let i = updated.length - 1; i >= 0; i--) {
         if (updated[i].type === 'ai') {
           updated[i] = { ...updated[i], content: aiMessage };
           break;
         }
       }
       return updated;
     });
   }
   ```

   - fetch로 API를 호출하고, 응답의 body에서 getReader()로 스트림을 읽는다.
   - TextDecoder로 한글/영문 등 텍스트를 잘 복원해서 chunk 단위로 받아온다.
   - chunk가 들어올 때마다 aiMessage에 누적해서, setMessages로 마지막 ai 메시지를 실시간으로 업데이트한다.
   - 그래서 실제로 채팅창에서 답변이 한 글자씩 실시간으로 보인다.

# LangChain으로 도구 사용하기
LangChain은 각종 도구를 등록하여 LLM이 활용할 수 있도록 한다.
LLM은 도구 활용이 가능한 Qwen3로 한다.
LangChain을 사용할 때에는 스트리밍 응답이 불가능하고, thinking을 임의로 끌 수 없다는 단점이 있다.(ollama에서는 끌 수 있는데 chatOllama에서는 아직 미지원인듯.)


## 1. 프로젝트 구조 이해

```
frontend/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # 기본 Ollama 챗봇 (스트리밍)
│   │   └── agent/route.ts         # LangGraph ReactAgent (툴 지원)
│   ├── page.tsx                   # 기본 챗봇 UI
│   └── agent/page.tsx             # Agent 챗봇 UI
```

## 2. 필요한 패키지 설치

```bash
cd frontend
npm install @langchain/langgraph @langchain/ollama @langchain/core zod ollama
```

## 3. LangGraph vs LangChain 차이점

### LangChain (기본)
- **용도**: LLM과 직접 통신, 단순 챗봇
- **장점**: 스트리밍 완벽 지원, 빠른 응답
- **단점**: 복잡한 워크플로우 제한적

### LangGraph (고급)
- **용도**: 에이전트, 툴, 멀티스텝 워크플로우
- **장점**: 툴 호출, 복잡한 로직, 확장성
- **단점**: 스트리밍 제한적, 일부 모델에서 툴 미지원

## 4. 단계별 구현 과정

### Step 1: 기본 LangChain 챗봇 (스트리밍)

```typescript
// app/api/chat/route.ts
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

const chat = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'qwen3:4b',
  streaming: true,
});

// 스트리밍 응답
const stream = await chat.stream(messages);
for await (const chunk of stream) {
  // 실시간으로 chunk.content 전송
}
```

### Step 2: LangGraph ReactAgent 생성

```typescript
// app/api/agent/route.ts
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOllama } from '@langchain/ollama';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 1. 툴 정의
const nowTool = tool(async (_input) => {
  return `현재 시각은 ${new Date().toLocaleString('ko-KR')} 입니다.`;
}, {
  name: 'now',
  description: '현재 시각을 알려줍니다.',
  schema: z.object({}) // 입력 파라미터 없음
});

// 2. LLM 설정
const model = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'qwen3:4b',
  streaming: false, // LangGraph에서는 false 권장
});

// 3. Agent 생성
const agent = createReactAgent({
  llm: model,
  tools: [nowTool],
});
```

### Step 3: 메시지 처리 및 응답

```typescript
// 메시지 배열 (LangChain Message 객체 사용)
let messages = [
  new SystemMessage({ content: "사용자는 한국인이야." }),
];

// POST 요청 처리
export async function POST(request: NextRequest) {
  const { userInput } = await request.json();
  
  // 사용자 메시지 추가
  messages.push(new HumanMessage({ content: userInput }));

  // Agent 호출 (invoke 방식 - 빠른 응답)
  const result = await agent.invoke({
    messages: messages.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : 
            msg._getType() === 'ai' ? 'assistant' : 'system',
      content: msg.content
    }))
  });

  // 응답 추출
  let aiContent = '';
  if (Array.isArray(result?.messages)) {
    for (let i = result.messages.length - 1; i >= 0; i--) {
      const m = result.messages[i];
      if (m._getType() === 'ai') {
        aiContent = m.content;
        break;
      }
    }
  }
  
  // 대화 기록에 저장
  messages.push(new AIMessage({ content: aiContent }));

  return NextResponse.json({
    message: "AI 응답입니다.",
    aiResponse: aiContent
  });
}
```

### Step 4: 프론트엔드 연동

```typescript
// app/agent/page.tsx
const sendMessage = async () => {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput: userMessage }),
  });

  const data = await response.json();
  
  if (data.aiResponse) {
    setMessages(prev => [...prev, { type: 'ai', content: data.aiResponse }]);
  }
};
```

## 5. 핵심 개념 정리

### LangChain Message 객체
```typescript
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

// 메시지 타입
new SystemMessage({ content: "시스템 프롬프트" });
new HumanMessage({ content: "사용자 입력" });
new AIMessage({ content: "AI 응답" });

// 타입 확인
msg._getType() // 'system', 'human', 'ai'
```

### 툴(Tool) 정의
```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const myTool = tool(async (input) => {
  // 툴 로직
  return "결과";
}, {
  name: 'tool_name',
  description: '툴 설명',
  schema: z.object({
    // 입력 파라미터 스키마
  })
});
```

### Agent 타입
```typescript
// ReactAgent: ReAct 패턴 (추론 + 행동)
const agent = createReactAgent({
  llm: model,
  tools: [tool1, tool2],
});

// 다른 Agent 타입들
// - createOpenAIFunctionsAgent
// - createStructuredChatAgent
// - createConversationalRetrievalAgent
```

## 6. 스트리밍 vs Invoke

### 스트리밍 (LangChain 직접)
```typescript
// 완벽한 실시간 스트리밍
const stream = await chat.stream(messages);
for await (const chunk of stream) {
  // chunk.content를 실시간으로 전송
}
```

### Invoke (LangGraph Agent)
```typescript
// 한 번에 전체 응답
const result = await agent.invoke({ messages });
// result.messages에서 마지막 assistant 메시지 추출
```

## 7. 모델별 툴 지원 현황

### 툴 지원 모델
- OpenAI GPT-4, GPT-3.5-turbo
- Anthropic Claude
- 일부 최신 Ollama 모델 (qwen3 등)

### 툴 미지원 모델
- 대부분의 community 모델
- HyperCLOVAX, Llama-2 등

**에러 메시지**: `"model does not support tools"`

## 8. 실전 팁

### 성능 최적화
```typescript
// 1. 스트리밍 끄기 (LangGraph에서)
streaming: false

// 2. 불필요한 fallback 제거
// 3. 메시지 배열 최적화
```

### 에러 처리
```typescript
try {
  const result = await agent.invoke({ messages });
} catch (error) {
  if (error.message.includes('does not support tools')) {
    // 툴 없이 기본 LLM으로 fallback
  }
}
```

### 확장 가능한 구조
```typescript
// 툴 추가
const tools = [
  nowTool,
  searchTool,
  calculatorTool,
  // ... 더 많은 툴
];

const agent = createReactAgent({
  llm: model,
  tools: tools,
});
```


## 검색 도구
DuckDuckGo 도구가 막혀서 구글 검색으로 구글 검색 도구를 만든다.
### 구글 API키 발급받기
[참고 - 바티 사용가이드](https://guide.bati.ai/service/api/googleapi)
1. Custom Search JSON API 발급 사이트로 이동한다. [링크](https://developers.google.com/custom-search/v1/overview?hl=ko)
2. 화면 중간의 `키 가져오기` 버튼을 눌러 프로젝트와 연결하고 키를 받아온다. -> 해당 키를 `.env`에 `GOOGLE_SEARCH_API_KEY = `로 할당한다.
3. 구글 클라우드 콘솔 관리자 페이지의 검색엔진 추가로 접속한다. [링크](https://programmablesearchengine.google.com/controlpanel/all)
4. `새 검색엔진 만들기`에서 `전체 웹 검색`을 체크하면 구글 검색을 하는 검색엔진이 생성된다.
5. `검색엔진 ID`를 복사한다. -> 해당 키를 `.env`에 `GOOGLE_SEARCH_CX=`로 할당한다.

### 구글 검색
`https://www.googleapis.com`에 key와 cx를 쿼리 스트링으로 전달하고, 검색할 문구를 `q`로 전달한다.
응답은 JSON 형식으로 온다.
JSON 형식을 인공지능이 확인할 수 있는 값으로 파싱하여 전달하면 된다. (너무 길면 제대로 정보를 파악하지 못한다.)
```ts
export const googleSearchTool = tool(
  async ({ query }) => {
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CX,
      q: query,
    });

    const url = `https://www.googleapis.com/customsearch/v1?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Google 검색 실패: ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.items ?? [];

    if (items.length === 0) {
      return `"${query}"에 대한 검색 결과가 없습니다.`;
    }

    return JSON.stringify(items.map((e:any)=>{
      return {
        title: e.title,
        link: e.link,
        snippet: e.snippet
      }
    }));
  },
  {
    name: "google_search",
    description: "구글에서 실시간 정보를 검색합니다.",
    schema: z.object({
      query: z.string().describe("검색할 키워드 또는 질문"),
    }),
  }
);
```