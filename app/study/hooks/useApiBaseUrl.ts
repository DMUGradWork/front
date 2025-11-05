import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../../config/api';

export function useApiBaseUrl(defaultIp = '172.16.113.138', port = 8080) {
  const [baseUrl, setBaseUrl] = useState(() => getApiBaseUrl(port));

  useEffect(() => {
    const getLocalIp = async () => {
      try {
        // 설정 파일에서 URL 가져오기
        const url = getApiBaseUrl(port);
    console.log('[useApiBaseUrl] URL 설정:', url);
    setBaseUrl(url);
      } catch (error) {
        console.error('[useApiBaseUrl] URL 설정 실패:', error);
        // 실패 시 기본값 사용
        const url = getApiBaseUrl(port);
        console.log('[useApiBaseUrl] 기본 URL 설정:', url);
        setBaseUrl(url);
      }
    };

    getLocalIp();
  }, [port]);

  return baseUrl;
}

