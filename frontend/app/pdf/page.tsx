'use client';

import { useState, useRef } from 'react';

interface ChunkInfo {
  id: string;
  chunkIndex: number;
  startIndex: number;
  endIndex: number;
  textLength: number;
  preview: string;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  summary?: {
    filename: string;
    fileSize: number;
    totalTextLength: number;
    totalChunks: number;
    pageCount: number;
    author: string;
    title: string;
  };
  chunks?: ChunkInfo[];
}

interface SearchResult {
  id: number;
  content: string;
  metadata: {
    filename: string;
    chunkIndex: number;
    startIndex: number;
    endIndex: number;
    pageCount: number;
    author: string;
    title: string;
    timestamp: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export default function PDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState('');
  const [allDocuments, setAllDocuments] = useState<SearchResult[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setMessage('');
      } else {
        setMessage('PDF 파일만 선택 가능합니다.');
        setFile(null);
      }
    }
  };

  // PDF 업로드 및 처리
  const processPDF = async () => {
    if (!file) {
      setMessage('PDF 파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setMessage('');
    setProcessingResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (source.trim()) formData.append('source', source.trim());
      if (category.trim()) formData.append('category', category.trim());

      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setProcessingResult(data);
        setMessage(data.message);
        // 처리 후 폼 초기화
        setFile(null);
        setSource('');
        setCategory('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage(`처리 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('PDF 처리 중 오류:', error);
      setMessage('PDF 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 전체 PDF 문서 목록 조회
  const loadAllDocuments = async () => {
    setIsLoadingDocuments(true);
    setMessage('');

    try {
      const response = await fetch('/api/pdf?query=*&limit=100');
      const data = await response.json();

      if (data.success) {
        setAllDocuments(data.results);
        setMessage(`${data.results.length}개의 PDF 문서를 찾았습니다.`);
      } else {
        setMessage(`목록 조회 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('목록 조회 중 오류:', error);
      setMessage('목록 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // PDF 검색
  const searchPDF = async () => {
    if (!searchQuery.trim()) {
      setMessage('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setMessage('');

    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        limit: '10',
      });
      
      if (selectedFilename) {
        params.append('filename', selectedFilename);
      }

      const response = await fetch(`/api/pdf?${params}`);
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

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPDF();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PDF 업로드 및 처리</h1>

        {/* 메시지 표시 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('성공') || message.includes('결과') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF 업로드 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">PDF 업로드</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF 파일 *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                />
                {file && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>파일명: {file.name}</p>
                    <p>크기: {formatFileSize(file.size)}</p>
                  </div>
                )}
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
                    placeholder="예: 회사 문서, 연구 논문 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
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
                    placeholder="예: 기술, 법률, 교육 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <button
                onClick={processPDF}
                disabled={isProcessing || !file}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? '처리 중...' : 'PDF 업로드 및 처리'}
              </button>
            </div>
          </div>

          {/* 검색 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">PDF 검색</h2>
            
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
                    placeholder="검색할 내용을 입력하세요..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSearching}
                  />
                  <button
                    onClick={searchPDF}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일명 필터 (선택사항)
                </label>
                <input
                  type="text"
                  value={selectedFilename}
                  onChange={(e) => setSelectedFilename(e.target.value)}
                  placeholder="특정 파일에서만 검색"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSearching}
                />
              </div>

              <button
                onClick={loadAllDocuments}
                disabled={isLoadingDocuments}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingDocuments ? '로딩 중...' : '전체 PDF 문서 목록 보기'}
              </button>
            </div>
          </div>
        </div>

        {/* 처리 결과 표시 */}
        {processingResult && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">처리 결과</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">문서 정보</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>파일명: {processingResult.summary?.filename}</p>
                  <p>크기: {formatFileSize(processingResult.summary?.fileSize || 0)}</p>
                  <p>페이지 수: {processingResult.summary?.pageCount}페이지</p>
                  <p>총 텍스트 길이: {processingResult.summary?.totalTextLength?.toLocaleString()}자</p>
                  <p>생성된 청크: {processingResult.summary?.totalChunks}개</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">메타데이터</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>제목: {processingResult.summary?.title || '없음'}</p>
                  <p>작성자: {processingResult.summary?.author || '없음'}</p>
                  <p>출처: {source || '없음'}</p>
                  <p>카테고리: {category || '없음'}</p>
                </div>
              </div>
            </div>

            {processingResult.chunks && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">생성된 청크 목록</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processingResult.chunks.map((chunk, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          청크 {chunk.chunkIndex + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {chunk.textLength}자 (위치: {chunk.startIndex}-{chunk.endIndex})
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{chunk.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 전체 PDF 문서 목록 표시 */}
        {allDocuments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 PDF 문서 목록</h3>
            <div className="space-y-4">
              {allDocuments.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{result.metadata.filename}</span>
                      <span className="ml-2">청크 {result.metadata.chunkIndex + 1}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      위치: {result.metadata.startIndex}-{result.metadata.endIndex}
                    </div>
                  </div>
                  <p className="text-gray-900 mb-2">{result.content}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>저장 시간: {new Date(result.metadata.timestamp).toLocaleString('ko-KR')}</span>
                    {result.metadata.author && (
                      <span className="ml-4">작성자: {result.metadata.author}</span>
                    )}
                    {result.metadata.title && (
                      <span className="ml-4">제목: {result.metadata.title}</span>
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

        {/* 검색 결과 표시 */}
        {searchResults.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 결과</h3>
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{result.metadata.filename}</span>
                      <span className="ml-2">청크 {result.metadata.chunkIndex + 1}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      위치: {result.metadata.startIndex}-{result.metadata.endIndex}
                    </div>
                  </div>
                  <p className="text-gray-900 mb-2">{result.content}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>저장 시간: {new Date(result.metadata.timestamp).toLocaleString('ko-KR')}</span>
                    {result.metadata.author && (
                      <span className="ml-4">작성자: {result.metadata.author}</span>
                    )}
                    {result.metadata.title && (
                      <span className="ml-4">제목: {result.metadata.title}</span>
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
      </div>
    </div>
  );
}
