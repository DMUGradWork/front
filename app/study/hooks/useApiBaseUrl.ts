import { useEffect, useState } from 'react';

export function useApiBaseUrl(defaultIp = '192.168.0.41', port = 8080) {
  const [baseUrl, setBaseUrl] = useState(`http://${defaultIp}:${port}`);

  useEffect(() => {
    const setLocalIP = async () => {
      try {
        // Lazy require to avoid platform issues during tests/build
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getIpAddressAsync } = require('expo-network');
        const ip = await getIpAddressAsync();
        const finalIp = ip || defaultIp;
        setBaseUrl(`http://${finalIp}:${port}`);
        console.log('로컬 IP 설정됨:', finalIp);
      } catch (error) {
        console.log('IP 감지 실패, 기본 IP 사용:', error);
        setBaseUrl(`http://${defaultIp}:${port}`);
      }
    };
    setLocalIP();
  }, [defaultIp, port]);

  return baseUrl;
}

