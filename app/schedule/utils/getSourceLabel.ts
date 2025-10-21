import type { ScheduleSource } from '../types';

/**
 * 일정 소스 타입에 대한 한글 라벨 반환
 * @param source 일정 소스 타입
 * @returns 한글 라벨
 */
export function getSourceLabel(source: ScheduleSource): string {
  switch (source) {
    case 'CUSTOM':
      return '개인 일정';
    case 'DATING':
      return '데이팅 일정';
    case 'STUDY':
      return '스터디 일정';
    default:
      return '알 수 없음';
  }
}

/**
 * 일정 소스 타입에 대한 색상 반환 (UI에서 사용)
 * @param source 일정 소스 타입
 * @returns 색상 코드
 */
export function getSourceColor(source: ScheduleSource): string {
  switch (source) {
    case 'CUSTOM':
      return '#4A90E2'; // 파란색
    case 'DATING':
      return '#E94B8A'; // 핑크색
    case 'STUDY':
      return '#50C878'; // 초록색
    default:
      return '#999999'; // 회색
  }
}

/**
 * 일정 소스 타입에 대한 아이콘 이름 반환
 * @param source 일정 소스 타입
 * @returns 아이콘 이름 (예: Ionicons 아이콘 이름)
 */
export function getSourceIcon(source: ScheduleSource): string {
  switch (source) {
    case 'CUSTOM':
      return 'calendar-outline';
    case 'DATING':
      return 'heart-outline';
    case 'STUDY':
      return 'book-outline';
    default:
      return 'help-outline';
  }
}
