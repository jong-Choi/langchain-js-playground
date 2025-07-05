'use client';

import { useState } from 'react';

interface Document {
  id: string;
  content: string;
  metadata: {
    timestamp: string;
    source?: string;
    category?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

interface SearchResult {
  id: number;
  content: string;
  metadata: {
    timestamp: string;
    source?: string;
    category?: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export default function TextPage() {
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 텍스트 저장
  const saveText = async () => {
    if (!text.trim()) {
      setMessage('텍스트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const metadata: any = {};
      if (source.trim()) metadata.source = source.trim();
      if (category.trim()) metadata.category = category.trim();

      const response = await fetch('/api/chroma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          metadata,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('텍스트가 성공적으로 저장되었습니다!');
        setText('');
        setSource('');
        setCategory('');
        // 저장 후 목록 새로고침
        loadDocuments();
      } else {
        setMessage(`저장 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('저장 중 오류:', error);
      setMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 저장된 문서 목록 조회
  const loadDocuments = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/chroma?query=*&limit=50');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.results);
        setMessage(`${data.results.length}개의 문서를 찾았습니다.`);
      } else {
        setMessage(`조회 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('조회 중 오류:', error);
      setMessage('조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 텍스트 검색
  const searchText = async () => {
    if (!searchQuery.trim()) {
      setMessage('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setMessage('');

    try {
      const response = await fetch(`/api/chroma?query=${encodeURIComponent(searchQuery.trim())}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results);
        setMessage(`"${searchQuery}" 검색 결과: ${data.results.length}개`);
      } else {
        setMessage(`검색 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('검색 중 오류:', error);
      setMessage('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveText();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchText();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">텍스트 저장 및 검색</h1>

        {/* 메시지 표시 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('성공') || message.includes('찾았습니다') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 텍스트 저장 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">텍스트 저장</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  텍스트 *
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="저장할 텍스트를 입력하세요..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출처
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="예: 웹사이트, 문서 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="예: 기술, 문학, 뉴스 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                onClick={saveText}
                disabled={isLoading || !text.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '저장 중...' : '텍스트 저장'}
              </button>
            </div>
          </div>

          {/* 검색 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">텍스트 검색</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  검색어
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="검색할 텍스트를 입력하세요..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSearching}
                  />
                  <button
                    onClick={searchText}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>
              </div>

              <button
                onClick={loadDocuments}
                disabled={isLoading}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '로딩 중...' : '전체 문서 목록 보기'}
              </button>
            </div>
          </div>
        </div>

        {/* 검색 결과 표시 */}
        {searchResults.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 결과</h3>
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 mb-2">{result.content}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>저장 시간: {new Date(result.metadata.timestamp).toLocaleString('ko-KR')}</span>
                    {result.metadata.source && (
                      <span className="ml-4">출처: {result.metadata.source}</span>
                    )}
                    {result.metadata.category && (
                      <span className="ml-4">카테고리: {result.metadata.category}</span>
                    )}
                  </div>
                  {result.embedding && result.embedding.length > 0 && (
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                      <span className="font-medium">벡터 (앞 10개): </span>
                      {result.embedding.slice(0, 10).map((val, i) => (
                        <span key={i} className="mr-1">{val.toFixed(4)}</span>
                      ))}
                      {result.embedding.length > 10 && (
                        <span className="text-gray-500">... (총 {result.embedding.length}차원)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전체 문서 목록 표시 */}
        {documents.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">저장된 문서 목록</h3>
            <div className="space-y-4">
              {documents.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 mb-2">{doc.content}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>저장 시간: {new Date(doc.metadata.timestamp).toLocaleString('ko-KR')}</span>
                    {doc.metadata.source && (
                      <span className="ml-4">출처: {doc.metadata.source}</span>
                    )}
                    {doc.metadata.category && (
                      <span className="ml-4">카테고리: {doc.metadata.category}</span>
                    )}
                  </div>
                  {doc.embedding && doc.embedding.length > 0 && (
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                      <span className="font-medium">벡터 (앞 10개): </span>
                      {doc.embedding.slice(0, 10).map((val, i) => (
                        <span key={i} className="mr-1">{val.toFixed(4)}</span>
                      ))}
                      {doc.embedding.length > 10 && (
                        <span className="text-gray-500">... (총 {doc.embedding.length}차원)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 