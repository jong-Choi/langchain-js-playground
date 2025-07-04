#!/usr/bin/env python3
"""
ChromaDB 연결 테스트 스크립트
"""

import chromadb
from chromadb.config import Settings

def test_chroma_connection():
    """ChromaDB 연결을 테스트합니다."""
    try:
        # ChromaDB 클라이언트 생성
        print("ChromaDB 클라이언트 생성 중...")
        client = chromadb.HttpClient(host="localhost", port=8000)
        
        # 연결 테스트
        print("연결 테스트 중...")
        heartbeat = client.heartbeat()
        print(f"✅ Heartbeat: {heartbeat}")
        
        # 버전 확인
        version = client.get_version()
        print(f"✅ ChromaDB 버전: {version}")
        
        # 컬렉션 목록 확인
        collections = client.list_collections()
        print(f"✅ 기존 컬렉션: {len(collections)}개")
        
        # 테스트 컬렉션 생성
        print("테스트 컬렉션 생성 중...")
        collection_name = "test_collection"
        
        # 기존 컬렉션이 있으면 삭제
        try:
            client.delete_collection(name=collection_name)
            print(f"기존 컬렉션 '{collection_name}' 삭제됨")
        except:
            pass
        
        # 새 컬렉션 생성
        collection = client.create_collection(name=collection_name)
        print(f"✅ 컬렉션 '{collection_name}' 생성됨")
        
        # 문서 추가
        print("테스트 문서 추가 중...")
        collection.add(
            documents=["안녕하세요! 이것은 테스트 문서입니다.", "ChromaDB는 벡터 데이터베이스입니다."],
            metadatas=[{"source": "test1", "language": "ko"}, {"source": "test2", "language": "ko"}],
            ids=["doc1", "doc2"]
        )
        print("✅ 문서 추가 완료")
        
        # 쿼리 테스트
        print("쿼리 테스트 중...")
        results = collection.query(
            query_texts=["테스트"],
            n_results=2
        )
        print(f"✅ 쿼리 결과: {len(results['documents'][0])}개 문서 발견")
        
        # 컬렉션 삭제
        client.delete_collection(name=collection_name)
        print(f"✅ 테스트 컬렉션 '{collection_name}' 삭제됨")
        
        print("\n🎉 모든 테스트가 성공적으로 완료되었습니다!")
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False

if __name__ == "__main__":
    print("ChromaDB 연결 테스트를 시작합니다...")
    print("=" * 50)
    
    success = test_chroma_connection()
    
    if success:
        print("\n✅ ChromaDB가 정상적으로 작동하고 있습니다!")
    else:
        print("\n❌ ChromaDB 연결에 문제가 있습니다.")
        print("서버가 실행 중인지 확인해주세요: chroma run --host localhost --port 8000 --path ./chroma_data") 