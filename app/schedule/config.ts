/**
 * Schedule 도메인 개발 환경 설정
 */

/**
 * Mock 데이터 사용 여부
 *
 * true: Mock 데이터 사용 (서버 없이 테스트 가능)
 * false: 실제 API 서버와 통신
 *
 * 개발 시에는 true로 설정하여 서버 없이 UI를 테스트할 수 있습니다.
 * 실제 서버와 통신할 때는 false로 변경하세요.
 */
export const USE_MOCK_DATA = true;

/**
 * API 설정
 */
export const API_CONFIG = {
  // Command Service 포트
  COMMAND_PORT: 8081,

  // Query Service 포트
  QUERY_PORT: 8082,

  // 기본 IP 주소
  DEFAULT_IP: '192.168.0.41',
};

/**
 * Mock 데이터 설정
 */
export const MOCK_CONFIG = {
  // Mock API 응답 지연 시간 (ms)
  // 실제 네트워크 상황을 시뮬레이션하기 위해 사용
  RESPONSE_DELAY: 500,

  // 페이지당 기본 아이템 수
  DEFAULT_PAGE_SIZE: 20,
};
