import type {
  Schedule,
  ScheduleListResponse,
  ScheduleQueryParams,
  DayScheduleQueryParams,
} from '../types';

/**
 * Schedule Query Service API Client
 * CQRS Query Side - 일정 조회
 */

const QUERY_PORT = 8082; // Query Service 포트 (임의 설정)

interface QueryApiConfig {
  baseUrl: string;
  ownerId: string;
}

/**
 * API 요청 헬퍼 함수
 */
async function fetchQuery<T>(
  config: QueryApiConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Owner-Id': config.ownerId,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('스케줄이 없습니다');
    }
    const errorText = await response.text();
    throw new Error(`Query API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * 쿼리 파라미터 빌더
 */
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * 일정 단건 조회
 * GET /schedules/{scheduleId}
 */
export async function getSchedule(
  baseUrl: string,
  ownerId: string,
  scheduleId: string
): Promise<Schedule> {
  const config = { baseUrl: `${baseUrl}:${QUERY_PORT}`, ownerId };
  return fetchQuery<Schedule>(config, `/schedules/${scheduleId}`);
}

/**
 * 특정 날짜의 일정 목록 조회 (페이징)
 * GET /schedules?day={date}&page={page}&size={size}&sort={sort}
 */
export async function getSchedulesByDay(
  baseUrl: string,
  ownerId: string,
  params: DayScheduleQueryParams
): Promise<ScheduleListResponse> {
  const config = { baseUrl: `${baseUrl}:${QUERY_PORT}`, ownerId };
  const queryString = buildQueryParams(params);
  return fetchQuery<ScheduleListResponse>(config, `/schedules${queryString}`);
}

/**
 * 사용자의 전체 일정 목록 조회 (페이징)
 * GET /schedules/all?page={page}&size={size}&sort={sort}
 */
export async function getAllSchedules(
  baseUrl: string,
  ownerId: string,
  params: ScheduleQueryParams = {}
): Promise<ScheduleListResponse> {
  const config = { baseUrl: `${baseUrl}:${QUERY_PORT}`, ownerId };
  const queryString = buildQueryParams(params);
  return fetchQuery<ScheduleListResponse>(config, `/schedules/all${queryString}`);
}

/**
 * 월별 일정 목록 조회 (특정 월의 모든 날짜)
 * 참고: 이 함수는 프론트엔드에서 월별 캘린더 뷰를 위해 사용
 */
export async function getSchedulesByMonth(
  baseUrl: string,
  ownerId: string,
  year: number,
  month: number,
  params: ScheduleQueryParams = {}
): Promise<ScheduleListResponse> {
  const config = { baseUrl: `${baseUrl}:${QUERY_PORT}`, ownerId };

  // 월의 시작일과 마지막일 계산
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // ISO 형식으로 변환
  const startDay = startDate.toISOString().split('T')[0];
  const endDay = endDate.toISOString().split('T')[0];

  // 전체 일정을 가져와서 월별로 필터링
  // 실제로는 백엔드에 범위 조회 API가 있다면 더 효율적입니다
  const queryParams = {
    ...params,
    // 필요시 startDate, endDate 파라미터 추가
  };
  const queryString = buildQueryParams(queryParams);

  return fetchQuery<ScheduleListResponse>(config, `/schedules/all${queryString}`);
}
