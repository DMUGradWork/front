import { useEffect, useState } from 'react';
import { getScheduleServiceUrl } from '../../config/api';

/**
 * Schedule 서비스용 API Base URL Hook
 * Command Service와 Query Service는 각각 다른 포트를 사용합니다.
 */
export function useScheduleApiBaseUrl(defaultIp = '172.16.113.138') {
  const [baseUrl, setBaseUrl] = useState(() => getScheduleServiceUrl());

  useEffect(() => {
    const getLocalIp = async () => {
      try {
        // 설정 파일에서 URL 가져오기
        const url = getScheduleServiceUrl();
    console.log('[Schedule] URL 설정:', url);
    setBaseUrl(url);
      } catch (error) {
        console.error('[Schedule] URL 설정 실패:', error);
        // 실패 시 기본값 사용
        const url = getScheduleServiceUrl();
        console.log('[Schedule] 기본 URL 설정:', url);
        setBaseUrl(url);
      }
    };

    getLocalIp();
  }, []);

  return baseUrl;
}
