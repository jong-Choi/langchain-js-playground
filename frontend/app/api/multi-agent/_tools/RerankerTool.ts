import { tool } from "@langchain/core/tools";
import { z } from "zod";

const RERANKER_API = "http://localhost:8811/rerank";

export const rerankTool = tool(
  async (input: { query: string; candidates: string[] }) => {
    const { query, candidates } = input;

    const limitedCandidates = candidates.slice(0, 10);

    // FastAPI 서버에 POST 요청
    const response = await fetch(RERANKER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        documents: limitedCandidates,
        instruction:
          "Given a web search query, retrieve relevant passages that answer the query",
      }),
    });

    if (!response.ok) {
      throw new Error(`리랭커 서버 호출 실패: ${response.statusText}`);
    }

    const data = await response.json();
    const scores: number[] = data.scores;

    const results = limitedCandidates.map((doc, i) => ({
      doc,
      score: scores[i] ?? 0,
    }));

    const sorted = results.sort((a, b) => b.score - a.score);

    return sorted.slice(0, 3).map((item, idx) => ({
      rank: idx + 1,
      content: item.doc,
      score: item.score,
    }));
  },
  {
    name: "rerank_with_qwen3_local",
    description:
      "Query에 대한 후보 문서를 로컬 FastAPI Qwen3 리랭커 서버로 재정렬합니다.",
    schema: z.object({
      query: z.string(),
      candidates: z.array(z.string()),
    }),
  }
);
