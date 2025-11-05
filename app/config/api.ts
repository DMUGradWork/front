import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API 서버 설정
 * 
 * 사용 방법:
 * 1. 개발 환경 (Expo Go): 개발 PC의 IP 주소 사용
 * 2. 프로덕션 환경: 실제 서버 도메인/IP 사용
 * 3. 환경 변수로 오버라이드 가능
 * 
 * 환경 변수 설정:
 * - EXPO_PUBLIC_API_BASE_URL: 전체 API Base URL (예: http://172.16.113.138)
 * - EXPO_PUBLIC_STUDY_SERVICE_PORT: Study 서비스 포트 (기본: 8080)
 * - EXPO_PUBLIC_AUTH_SERVICE_PORT: Auth 서비스 포트 (기본: 8082)
 */

// 환경 변수에서 읽기
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 
                     process.env.EXPO_PUBLIC_API_BASE_URL || 
                     null;

const STUDY_SERVICE_PORT = Constants.expoConfig?.extra?.studyServicePort || 
                          process.env.EXPO_PUBLIC_STUDY_SERVICE_PORT || 
                          '8080';

const AUTH_SERVICE_PORT = Constants.expoConfig?.extra?.authServicePort || 
                         process.env.EXPO_PUBLIC_AUTH_SERVICE_PORT || 
                         '8082';

// 개발 PC IP (Expo Go 환경에서 사용)
const DEV_PC_IP = Constants.expoConfig?.extra?.devPcIp || 
                  process.env.EXPO_PUBLIC_DEV_PC_IP || 
                  '172.16.113.138';

// 프로덕션 서버 주소 (배포 환경에서 사용)
const PROD_SERVER_URL = Constants.expoConfig?.extra?.prodServerUrl || 
                        process.env.EXPO_PUBLIC_PROD_SERVER_URL || 
                        null;

/**
 * API Base URL 가져오기
 * @param port 포트 번호
 * @param serviceName 서비스 이름 (로그용)
 */
export function getApiBaseUrl(port: string | number, serviceName = 'API'): string {
  // 환경 변수로 전체 URL이 지정된 경우
  if (API_BASE_URL) {
    return `${API_BASE_URL}:${port}`;
  }
  
  // 프로덕션 서버 URL이 지정된 경우
  if (PROD_SERVER_URL && !__DEV__) {
    return `${PROD_SERVER_URL}:${port}`;
  }
  
  // 개발 환경: Expo Go면 개발 PC IP, 아니면 현재 IP
  const isExpoGo = __DEV__ && Platform.OS !== 'web';
  const baseIp = isExpoGo ? DEV_PC_IP : '172.16.113.138';
  
  return `http://${baseIp}:${port}`;
}

/**
 * Study 서비스 Base URL
 */
export function getStudyServiceUrl(): string {
  return getApiBaseUrl(STUDY_SERVICE_PORT, 'Study');
}

/**
 * Auth 서비스 Base URL
 */
export function getAuthServiceUrl(): string {
  return getApiBaseUrl(AUTH_SERVICE_PORT, 'Auth');
}

/**
 * Schedule 서비스 Base URL (포트 정보 없음)
 */
export function getScheduleServiceUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }
  
  if (PROD_SERVER_URL && !__DEV__) {
    return PROD_SERVER_URL;
  }
  
  const isExpoGo = __DEV__ && Platform.OS !== 'web';
  const baseIp = isExpoGo ? DEV_PC_IP : '172.16.113.138';
  
  return `http://${baseIp}`;
}

// 설정 정보 출력 (개발 환경에서만)
if (__DEV__) {
  console.log('[API Config]', {
    API_BASE_URL,
    PROD_SERVER_URL,
    DEV_PC_IP,
    STUDY_SERVICE_PORT,
    AUTH_SERVICE_PORT,
    isDev: __DEV__,
  });
}

