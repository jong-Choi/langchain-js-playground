# reranker_server.py
from fastapi import FastAPI, Request
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI()

MODEL_NAME = "Qwen/Qwen3-Reranker-0.6B"
DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

print("🔄 모델 로딩 중...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, padding_side='left')
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME, torch_dtype=torch.float16
).to(DEVICE).eval()
print("✅ 모델 로딩 완료")


# ===== 입력 구조 =====
class RerankInput(BaseModel):
    query: str
    documents: list[str]
    instruction: str | None = None  # optional


# ===== 입력 포맷 포장 =====
def format_input(instruction, query, doc):
    if instruction is None:
        instruction = "Given a web search query, retrieve relevant passages that answer the query"
    return f"<Instruct>: {instruction}\n<Query>: {query}\n<Document>: {doc}"


def compute_scores(query: str, docs: list[str], instruction: str | None = None):
    prefix = "<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Answer only \"yes\" or \"no\".<|im_end|>\n<|im_start|>user\n"
    suffix = "<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
    prefix_ids = tokenizer.encode(prefix, add_special_tokens=False)
    suffix_ids = tokenizer.encode(suffix, add_special_tokens=False)

    scores = []
    for doc in docs:
        text = format_input(instruction, query, doc)
        input_ids = tokenizer.encode(text, add_special_tokens=False)
        final_input = prefix_ids + input_ids + suffix_ids
        final_input = torch.tensor([final_input], device=DEVICE)

        with torch.no_grad():
            logits = model(final_input).logits[0, -1]
            yes_token = tokenizer.convert_tokens_to_ids("yes")
            no_token = tokenizer.convert_tokens_to_ids("no")
            probs = torch.softmax(logits[[no_token, yes_token]], dim=0)
            score = probs[1].item()  # 확률: yes
            scores.append(score)

    return scores


@app.post("/rerank")
async def rerank(input: RerankInput):
    scores = compute_scores(input.query, input.documents, input.instruction)
    return {"scores": scores}
