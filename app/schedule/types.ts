// Schedule 소스 타입
export type ScheduleSource = 'CUSTOM' | 'DATING' | 'STUDY';

// Schedule 기본 정보
export interface Schedule {
  id: string; // UUID
  ownerId: string; // UUID
  title: string;
  description?: string;
  startAt: string; // ISO-8601 format
  endAt: string; // ISO-8601 format
  source: ScheduleSource;
  eventVersion: number;
  occurredAt: string; // ISO-8601 format
  updatedAt: string; // ISO-8601 format
}

// Command API - 일정 생성 요청
export interface CreateScheduleRequest {
  title: string;
  description?: string;
  startAt: string; // ISO-8601 format (e.g., "2025-10-01T10:00:00")
  endAt: string; // ISO-8601 format
}

// Command API - 일정 수정 요청
export interface UpdateScheduleRequest {
  scheduleId: string; // UUID
  title: string;
  description?: string;
  startAt: string; // ISO-8601 format
  endAt: string; // ISO-8601 format
}

// Command API - 일정 삭제 요청
export interface DeleteScheduleRequest {
  scheduleId: string; // UUID
}

// Query API - 페이지네이션 응답
export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  empty: boolean;
}

// Query API - 조회 파라미터
export interface ScheduleQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface DayScheduleQueryParams extends ScheduleQueryParams {
  day: string; // LocalDate format (e.g., "2025-10-01")
}

// API 응답 타입
export type ScheduleResponse = Schedule;
export type ScheduleListResponse = PageResponse<Schedule>;

// 화면에서 사용할 타입
export type ActiveScheduleScreen = 'list' | 'calendar' | 'create' | 'detail';

export interface ScheduleFormData {
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
}
