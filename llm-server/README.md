# LLM Server with ChromaDB

이 프로젝트는 ChromaDB를 포함한 LLM 서버입니다.

## ChromaDB 설치 및 실행

### 1. 가상환경 설정

```bash
# 가상환경 생성
python3 -m venv .venv

# 가상환경 활성화
source .venv/bin/activate

# ChromaDB 설치
pip install chromadb
```

### 2. ChromaDB 서버 실행

```bash
# 가상환경 활성화
source .venv/bin/activate

# ChromaDB 서버 시작
chroma run --host localhost --port 8000 --path ./chroma_data
```

### 3. ChromaDB 접속 정보

- **URL**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **포트**: 8000
- **데이터 저장 위치**: `./chroma_data` (로컬 폴더)

### 4. Python 클라이언트로 테스트

```python
import chromadb
from chromadb.config import Settings

# ChromaDB 클라이언트 생성
client = chromadb.HttpClient(host="localhost", port=8000)

# 연결 테스트
client.heartbeat()  # 연결 확인
client.get_version()  # 버전 확인

# 컬렉션 생성
collection = client.create_collection(name="my_collection")

# 문서 추가
collection.add(
    documents=["This is a document", "This is another document"],
    metadatas=[{"source": "doc1"}, {"source": "doc2"}],
    ids=["id1", "id2"]
)

# 쿼리 실행
results = collection.query(
    query_texts=["This is a query"],
    n_results=2
)
```

## 환경 변수

- `IS_PERSISTENT=TRUE`: 데이터 영속성 활성화 (기본값)
- `PERSIST_DIRECTORY=./chroma_data`: 데이터 저장 경로
- `ANONYMIZED_TELEMETRY=TRUE`: 익명 텔레메트리 활성화 (기본값)

## 데이터 백업

데이터는 `./chroma_data` 폴더에 저장되므로, 이 폴더를 백업하면 됩니다.

## 문제 해결

### 포트 충돌
포트 8000이 이미 사용 중인 경우, 다른 포트를 사용하세요:

```bash
chroma run --host localhost --port 8001 --path ./chroma_data
```

### 권한 문제
데이터 폴더에 대한 권한이 없는 경우:

```bash
chmod -R 755 ./chroma_data
```

### 가상환경 비활성화
```bash
deactivate
``` 

## 크로마DB 실행방법
cd llm-server
source .venv/bin/activate
chroma run --host localhost --port 8000 --path ./chroma_data

## 크로마 DB 테스트 방법
python3 test_chroma.py

## 가상환경 설치방법
`pip install -r requirements.txt`
