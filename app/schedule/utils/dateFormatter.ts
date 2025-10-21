/**
 * 날짜/시간 포맷팅 유틸리티
 */

/**
 * Date 객체를 ISO-8601 형식 문자열로 변환
 * @param date Date 객체
 * @returns ISO-8601 형식 문자열 (예: "2025-10-01T10:00:00")
 */
export function toISO8601String(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * ISO-8601 형식 문자열을 Date 객체로 변환
 * @param isoString ISO-8601 형식 문자열
 * @returns Date 객체
 */
export function fromISO8601String(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Date 객체를 LocalDate 형식 문자열로 변환
 * @param date Date 객체
 * @returns LocalDate 형식 문자열 (예: "2025-10-01")
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 한글 형식으로 포맷팅
 * @param date Date 객체 또는 ISO 문자열
 * @returns "2025년 10월 1일" 형식
 */
export function formatKoreanDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  return `${year}년 ${month}월 ${day}일`;
}

/**
 * 시간을 한글 형식으로 포맷팅
 * @param date Date 객체 또는 ISO 문자열
 * @returns "오전 10:00" 또는 "오후 3:30" 형식
 */
export function formatKoreanTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours();
  const minutes = d.getMinutes();

  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');

  return `${period} ${displayHours}:${displayMinutes}`;
}

/**
 * 날짜와 시간을 함께 포맷팅
 * @param date Date 객체 또는 ISO 문자열
 * @returns "2025년 10월 1일 오전 10:00" 형식
 */
export function formatKoreanDateTime(date: Date | string): string {
  return `${formatKoreanDate(date)} ${formatKoreanTime(date)}`;
}

/**
 * 시작 시간과 종료 시간을 범위 형식으로 포맷팅
 * @param startAt 시작 시간
 * @param endAt 종료 시간
 * @returns "오전 10:00 - 오후 12:00" 형식
 */
export function formatTimeRange(startAt: Date | string, endAt: Date | string): string {
  return `${formatKoreanTime(startAt)} - ${formatKoreanTime(endAt)}`;
}

/**
 * 일정 기간(분) 계산
 * @param startAt 시작 시간
 * @param endAt 종료 시간
 * @returns 기간(분)
 */
export function calculateDurationInMinutes(
  startAt: Date | string,
  endAt: Date | string
): number {
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const end = typeof endAt === 'string' ? new Date(endAt) : endAt;

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * 분을 시간/분 형식으로 변환
 * @param minutes 분
 * @returns "1시간 30분" 또는 "30분" 형식
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}시간 ${mins}분`;
  } else if (hours > 0) {
    return `${hours}시간`;
  } else {
    return `${mins}분`;
  }
}

/**
 * 현재 날짜가 주어진 날짜와 같은 날인지 확인
 * @param date 확인할 날짜
 * @returns 같은 날이면 true
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * 두 날짜가 같은 날인지 확인
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 같은 날이면 true
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
