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

