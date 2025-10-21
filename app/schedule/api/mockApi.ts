import type {
  Schedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  DeleteScheduleRequest,
  ScheduleListResponse,
  ScheduleQueryParams,
  DayScheduleQueryParams,
} from '../types';
import { getInitialMockSchedules } from '../data/mockSchedules';
import { MOCK_CONFIG } from '../config';

/**
 * Mock API - 실제 서버 없이 로컬에서 CRUD 작업 수행
 */

// 메모리에 저장된 Mock 데이터
let mockScheduleStore: Schedule[] = getInitialMockSchedules();

// Mock API 응답 지연 시뮬레이션
function delay(ms: number = MOCK_CONFIG.RESPONSE_DELAY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// UUID v4 생성 (간단한 구현)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 날짜를 LocalDate 형식으로 변환
function toLocalDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 두 날짜가 같은 날인지 확인
function isSameDay(date1: Date, date2: Date): boolean {
  return toLocalDate(date1) === toLocalDate(date2);
}

// 페이지네이션 헬퍼
function paginate<T>(
  data: T[],
  page: number = 0,
  size: number = MOCK_CONFIG.DEFAULT_PAGE_SIZE
): ScheduleListResponse {
  const totalElements = data.length;
  const totalPages = Math.ceil(totalElements / size);
  const start = page * size;
  const end = start + size;
  const content = data.slice(start, end);

  return {
    content,
    pageable: {
      pageNumber: page,
      pageSize: size,
      sort: { sorted: false, unsorted: true, empty: true },
      offset: start,
      paged: true,
      unpaged: false,
    },
    totalPages,
    totalElements,
    last: page >= totalPages - 1,
    first: page === 0,
    size,
    number: page,
    sort: { sorted: false, unsorted: true, empty: true },
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

/**
 * Mock Command API
 */

export async function mockCreateSchedule(
  _baseUrl: string,
  ownerId: string,
  data: CreateScheduleRequest
): Promise<void> {
  await delay();

  const now = new Date().toISOString().slice(0, 19);
  const newSchedule: Schedule = {
    id: generateUUID(),
    ownerId,
    title: data.title,
    description: data.description,
    startAt: data.startAt,
    endAt: data.endAt,
    source: 'CUSTOM',
    eventVersion: 1,
    occurredAt: now,
    updatedAt: now,
  };

  mockScheduleStore.push(newSchedule);
  console.log('[Mock API] 일정 생성:', newSchedule);
}

export async function mockUpdateSchedule(
  _baseUrl: string,
  ownerId: string,
  data: UpdateScheduleRequest
): Promise<void> {
  await delay();

  const index = mockScheduleStore.findIndex(
    (s) => s.id === data.scheduleId && s.ownerId === ownerId
  );

  if (index === -1) {
    throw new Error('스케줄이 없습니다');
  }

  const now = new Date().toISOString().slice(0, 19);
  mockScheduleStore[index] = {
    ...mockScheduleStore[index],
    title: data.title,
    description: data.description,
    startAt: data.startAt,
    endAt: data.endAt,
    eventVersion: mockScheduleStore[index].eventVersion + 1,
    occurredAt: now,
    updatedAt: now,
  };

  console.log('[Mock API] 일정 수정:', mockScheduleStore[index]);
}

export async function mockDeleteSchedule(
  _baseUrl: string,
  ownerId: string,
  data: DeleteScheduleRequest
): Promise<void> {
  await delay();

  const index = mockScheduleStore.findIndex(
    (s) => s.id === data.scheduleId && s.ownerId === ownerId
  );

  if (index === -1) {
    throw new Error('스케줄이 없습니다');
  }

  const deleted = mockScheduleStore.splice(index, 1);
  console.log('[Mock API] 일정 삭제:', deleted[0]);
}

/**
 * Mock Query API
 */

export async function mockGetSchedule(
  _baseUrl: string,
  ownerId: string,
  scheduleId: string
): Promise<Schedule> {
  await delay();

  const schedule = mockScheduleStore.find(
    (s) => s.id === scheduleId && s.ownerId === ownerId
  );

  if (!schedule) {
    throw new Error('스케줄이 없습니다');
  }

  console.log('[Mock API] 일정 조회:', schedule);
  return schedule;
}

export async function mockGetSchedulesByDay(
  _baseUrl: string,
  ownerId: string,
  params: DayScheduleQueryParams
): Promise<ScheduleListResponse> {
  await delay();

  // day 파라미터로 필터링
  const targetDate = new Date(params.day);
  const filtered = mockScheduleStore
    .filter((s) => s.ownerId === ownerId)
    .filter((s) => {
      const scheduleDate = new Date(s.startAt);
      return isSameDay(scheduleDate, targetDate);
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const result = paginate(filtered, params.page, params.size);
  console.log(`[Mock API] 날짜별 일정 조회 (${params.day}):`, result.content.length, '개');
  return result;
}

export async function mockGetAllSchedules(
  _baseUrl: string,
  ownerId: string,
  params: ScheduleQueryParams = {}
): Promise<ScheduleListResponse> {
  await delay();

  const filtered = mockScheduleStore
    .filter((s) => s.ownerId === ownerId)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const result = paginate(filtered, params.page, params.size);
  console.log('[Mock API] 전체 일정 조회:', result.content.length, '개');
  return result;
}

export async function mockGetSchedulesByMonth(
  _baseUrl: string,
  ownerId: string,
  year: number,
  month: number,
  params: ScheduleQueryParams = {}
): Promise<ScheduleListResponse> {
  await delay();

  // 해당 월의 일정만 필터링
  const filtered = mockScheduleStore
    .filter((s) => s.ownerId === ownerId)
    .filter((s) => {
      const scheduleDate = new Date(s.startAt);
      return scheduleDate.getFullYear() === year && scheduleDate.getMonth() + 1 === month;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const result = paginate(filtered, params.page, params.size);
  console.log(`[Mock API] 월별 일정 조회 (${year}-${month}):`, result.content.length, '개');
  return result;
}

/**
 * Mock 데이터 초기화
 */
export function resetMockData(): void {
  mockScheduleStore = getInitialMockSchedules();
  console.log('[Mock API] Mock 데이터 초기화됨');
}

/**
 * 현재 Mock 데이터 가져오기 (디버깅용)
 */
export function getMockData(): Schedule[] {
  return [...mockScheduleStore];
}
