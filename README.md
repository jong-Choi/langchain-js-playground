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
    
    const data = await response.json();
    
    if (data.error) {
      setMessages(prev => [...prev, { type: 'ai', content: `에러: ${data.error}` }]);
    } else if (data.aiResponse) {
      setMessages(prev => [...prev, { type: 'ai', content: data.aiResponse }]);
    }
  } catch (error) {
    setMessages(prev => [...prev, { type: 'ai', content: '서버와의 통신 중 오류가 발생했습니다.' }]);
  } finally {
    setIsLoading(false);
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
  model: 'llama3.1',
  input: ['안녕하세요', '반갑습니다']
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

