import { USE_MOCK_DATA } from '../config';

// Mock 모드 여부에 따라 실제 API 또는 Mock API 선택
if (USE_MOCK_DATA) {
  console.log('[Schedule API] Mock 모드 활성화됨');
} else {
  console.log('[Schedule API] 실제 API 모드 활성화됨');
}

// Command API - 조건부 export
export const createSchedule = USE_MOCK_DATA
  ? require('./mockApi').mockCreateSchedule
  : require('./command').createSchedule;

export const updateSchedule = USE_MOCK_DATA
  ? require('./mockApi').mockUpdateSchedule
  : require('./command').updateSchedule;

export const deleteSchedule = USE_MOCK_DATA
  ? require('./mockApi').mockDeleteSchedule
  : require('./command').deleteSchedule;

// Query API - 조건부 export
export const getSchedule = USE_MOCK_DATA
  ? require('./mockApi').mockGetSchedule
  : require('./query').getSchedule;

export const getSchedulesByDay = USE_MOCK_DATA
  ? require('./mockApi').mockGetSchedulesByDay
  : require('./query').getSchedulesByDay;

export const getAllSchedules = USE_MOCK_DATA
  ? require('./mockApi').mockGetAllSchedules
  : require('./query').getAllSchedules;

export const getSchedulesByMonth = USE_MOCK_DATA
  ? require('./mockApi').mockGetSchedulesByMonth
  : require('./query').getSchedulesByMonth;

// Mock 데이터 관리 함수들 (개발/디버깅용)
export { resetMockData, getMockData } from './mockApi';
