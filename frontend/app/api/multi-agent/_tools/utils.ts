import { Ollama } from "ollama";

export const fetchWithSecretKey = (
  url: RequestInfo | URL,
  options: RequestInit | undefined = {}
) => {
  options.headers = {
    ...options.headers,
    LLM_SECRET_KEY: process.env.LLM_SECRET_KEY!,
  };
  return fetch(url, options);
};

// 모델이 설치되어 있는지 확인하는 함수
export async function ensureModelExists(modelName: string) {
  try {
    console.log(process.env.ORACLE_OLLAMA_HOST);
    const ollama = new Ollama({
      host: `${process.env.ORACLE_OLLAMA_HOST}`,
      fetch: fetchWithSecretKey,
    });
    const models = await ollama.list();
    const modelExists = models.models.some(
      (model: { name: string }) => model.name === modelName
    );

    if (!modelExists) {
      console.log(`모델 ${modelName}을 다운로드 중...`);
      await ollama.pull({ model: modelName });
      console.log(`모델 ${modelName} 다운로드 완료`);
    }
  } catch (error) {
    console.error("모델 확인/다운로드 중 에러:", error);
    throw new Error("모델을 준비할 수 없습니다.");
  }
}
