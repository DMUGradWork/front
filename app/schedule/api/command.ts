import type {
  CreateScheduleRequest,
  UpdateScheduleRequest,
  DeleteScheduleRequest,
} from '../types';

/**
 * Schedule Command Service API Client
 * CQRS Command Side - 일정 생성/수정/삭제
 */

const COMMAND_PORT = 8081; // Command Service 포트 (임의 설정)

interface CommandApiConfig {
  baseUrl: string;
  ownerId: string;
}

/**
 * API 요청 헬퍼 함수
 */
async function fetchCommand<T>(
  config: CommandApiConfig,
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
    const errorText = await response.text();
    throw new Error(`Command API Error: ${response.status} - ${errorText}`);
  }

  // 204 No Content 등의 경우 빈 응답 처리
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

/**
 * 커스텀 일정 생성
 * POST /schedules/custom
 */
export async function createSchedule(
  baseUrl: string,
  ownerId: string,
  data: CreateScheduleRequest
): Promise<void> {
  const config = { baseUrl: `${baseUrl}:${COMMAND_PORT}`, ownerId };
  await fetchCommand(config, '/schedules/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 커스텀 일정 수정
 * PATCH /schedules/custom
 */
export async function updateSchedule(
  baseUrl: string,
  ownerId: string,
  data: UpdateScheduleRequest
): Promise<void> {
  const config = { baseUrl: `${baseUrl}:${COMMAND_PORT}`, ownerId };
  await fetchCommand(config, '/schedules/custom', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 커스텀 일정 삭제
 * DELETE /schedules/custom
 */
export async function deleteSchedule(
  baseUrl: string,
  ownerId: string,
  data: DeleteScheduleRequest
): Promise<void> {
  const config = { baseUrl: `${baseUrl}:${COMMAND_PORT}`, ownerId };
  await fetchCommand(config, '/schedules/custom', {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}
