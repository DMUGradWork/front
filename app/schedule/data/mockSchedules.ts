import type { Schedule } from '../types';

/**
 * Mock 일정 데이터
 * 테스트 및 개발용 샘플 데이터
 */

// 오늘 날짜 기준 계산
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const dayAfterTomorrow = new Date(today);
dayAfterTomorrow.setDate(today.getDate() + 2);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

// ISO 문자열 생성 헬퍼
function createISOString(date: Date, hours: number, minutes: number = 0): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss" 형식
}

export const mockSchedules: Schedule[] = [
  // 오늘 일정
  {
    id: '8f8e5d5e-63d7-4a4e-9d2f-1b93b9a1e0c7',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '팀 회의',
    description: '주간 스프린트 회의 및 진행상황 공유',
    startAt: createISOString(today, 10, 0),
    endAt: createISOString(today, 11, 30),
    source: 'CUSTOM',
    eventVersion: 1,
    occurredAt: createISOString(today, 9, 0),
    updatedAt: createISOString(today, 9, 0),
  },
  {
    id: '7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '알고리즘 스터디 - 9월 1주차',
    description: '문제 풀이 공유 및 코드 리뷰',
    startAt: createISOString(today, 14, 0),
    endAt: createISOString(today, 16, 0),
    source: 'STUDY',
    eventVersion: 1,
    occurredAt: createISOString(today, 8, 0),
    updatedAt: createISOString(today, 8, 0),
  },
  {
    id: '9b8c7d6e-5f4e-3d2c-1b0a-9f8e7d6c5b4a',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '저녁 약속',
    startAt: createISOString(today, 19, 0),
    endAt: createISOString(today, 21, 0),
    source: 'DATING',
    eventVersion: 1,
    occurredAt: createISOString(today, 7, 30),
    updatedAt: createISOString(today, 7, 30),
  },

  // 내일 일정
  {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '운동',
    description: '헬스장 가기 - 상체 운동',
    startAt: createISOString(tomorrow, 7, 0),
    endAt: createISOString(tomorrow, 8, 30),
    source: 'CUSTOM',
    eventVersion: 1,
    occurredAt: createISOString(today, 20, 0),
    updatedAt: createISOString(today, 20, 0),
  },
  {
    id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '점심 미팅',
    description: '프로젝트 협업 논의',
    startAt: createISOString(tomorrow, 12, 0),
    endAt: createISOString(tomorrow, 13, 30),
    source: 'CUSTOM',
    eventVersion: 2,
    occurredAt: createISOString(today, 18, 0),
    updatedAt: createISOString(today, 21, 0),
  },
  {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: 'React Native 스터디',
    description: 'React Navigation 심화 학습',
    startAt: createISOString(tomorrow, 15, 0),
    endAt: createISOString(tomorrow, 17, 0),
    source: 'STUDY',
    eventVersion: 1,
    occurredAt: createISOString(today, 19, 0),
    updatedAt: createISOString(today, 19, 0),
  },

  // 모레 일정
  {
    id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '카페 데이트',
    startAt: createISOString(dayAfterTomorrow, 15, 0),
    endAt: createISOString(dayAfterTomorrow, 17, 0),
    source: 'DATING',
    eventVersion: 1,
    occurredAt: createISOString(today, 22, 0),
    updatedAt: createISOString(today, 22, 0),
  },
  {
    id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '독서',
    description: '클린 코드 읽기',
    startAt: createISOString(dayAfterTomorrow, 20, 0),
    endAt: createISOString(dayAfterTomorrow, 22, 0),
    source: 'CUSTOM',
    eventVersion: 1,
    occurredAt: createISOString(today, 23, 0),
    updatedAt: createISOString(today, 23, 0),
  },

  // 다음 주 일정
  {
    id: '6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: '월간 회고',
    description: '이번 달 성과 정리 및 다음 달 목표 설정',
    startAt: createISOString(nextWeek, 10, 0),
    endAt: createISOString(nextWeek, 12, 0),
    source: 'CUSTOM',
    eventVersion: 1,
    occurredAt: createISOString(today, 21, 0),
    updatedAt: createISOString(today, 21, 0),
  },
  {
    id: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
    ownerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: 'CS 스터디 - 네트워크',
    description: 'TCP/IP 프로토콜 스택 학습',
    startAt: createISOString(nextWeek, 19, 0),
    endAt: createISOString(nextWeek, 21, 0),
    source: 'STUDY',
    eventVersion: 1,
    occurredAt: createISOString(today, 20, 30),
    updatedAt: createISOString(today, 20, 30),
  },
];

// Mock 데이터 초기화 (메모리 저장용)
export function getInitialMockSchedules(): Schedule[] {
  return JSON.parse(JSON.stringify(mockSchedules)); // Deep copy
}
