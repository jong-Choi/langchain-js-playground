import { tool } from "@langchain/core/tools";
import ollama from "ollama";
import { ensureModelExists } from "./utils";
import { z } from "zod";

const RERANKER_MODEL = "hf.co/Mungert/Qwen3-Reranker-0.6B-GGUF:Q4_K_M";

// https://medium.com/@rosgluk/reranking-documents-with-ollama-and-qwen3-reranker-model-in-go-6dc9c2fb5f0b
export const rerankTool = tool(
  async (input: { query: string; candidates: string[] }) => {
    await ensureModelExists(RERANKER_MODEL);

    const { query, candidates } = input;

    // 후보 문서 수 제한 (최대 10개)
    const limitedCandidates = candidates.slice(0, 10);

    // 점수 계산 함수 (magnitude + positive ratio)
    function calculateRelevanceScore(embedding: number[]): number {
      let sumPositive = 0;
      let sumTotal = 0;
      for (const val of embedding) {
        sumTotal += val * val;
        if (val > 0) sumPositive += val;
      }
      if (sumTotal === 0) return 0;
      const magnitude = Math.sqrt(sumTotal) / embedding.length;
      const positiveRatio = sumPositive / embedding.length;
      return (magnitude + positiveRatio) / 2;
    }

    const scoredResults: { doc: string; score: number }[] = [];

    for (const doc of limitedCandidates) {
      const prompt = `Query: ${query}\n\nDocument: ${doc}\n\nRelevance:`;

      // Ollama embedding API 호출
      const res = await ollama.embeddings({
        model: RERANKER_MODEL,
        prompt: prompt,
      });
      const embedding = res.embedding as number[];
      const score = calculateRelevanceScore(embedding);
      scoredResults.push({ doc, score });
    }

    // 점수 내림차순 정렬 후 상위 3개 반환
    const sorted = scoredResults.sort((a, b) => b.score - a.score);
    return sorted.slice(0, 3).map((item, i) => ({
      rank: i + 1,
      content: item.doc,
      score: item.score,
    }));
  },
  {
    name: "rerank_with_qwen3",
    description:
      "Query에 대한 후보 문서들을 Qwen3 리랭커 임베딩 기반으로 재정렬합니다.",
    schema: z.object({
      query: z.string(),
      candidates: z.array(z.string()),
    }),
  }
);
