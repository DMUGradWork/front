import { useEffect, useState } from 'react';

/**
 * Schedule 서비스용 API Base URL Hook
 * Command Service와 Query Service는 각각 다른 포트를 사용합니다.
 */
export function useScheduleApiBaseUrl(defaultIp = '192.168.0.41') {
  const [baseUrl, setBaseUrl] = useState(`http://${defaultIp}`);

  useEffect(() => {
    const setLocalIP = async () => {
      try {
        // Lazy require to avoid platform issues during tests/build
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getIpAddressAsync } = require('expo-network');
        const ip = await getIpAddressAsync();
        const finalIp = ip || defaultIp;
        setBaseUrl(`http://${finalIp}`);
        console.log('[Schedule] 로컬 IP 설정됨:', finalIp);
      } catch (error) {
        console.log('[Schedule] IP 감지 실패, 기본 IP 사용:', error);
        setBaseUrl(`http://${defaultIp}`);
      }
    };
    setLocalIP();
  }, [defaultIp]);

  return baseUrl;
}
