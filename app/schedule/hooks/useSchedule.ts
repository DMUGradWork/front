import { useState, useCallback } from 'react';
import type {
  Schedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  DeleteScheduleRequest,
  ScheduleListResponse,
  DayScheduleQueryParams,
  ScheduleQueryParams,
} from '../types';
import * as scheduleApi from '../api';
import { useScheduleApiBaseUrl } from './useApiBaseUrl';

interface UseScheduleOptions {
  ownerId: string;
  defaultIp?: string;
}

export function useSchedule({ ownerId, defaultIp }: UseScheduleOptions) {
  const baseUrl = useScheduleApiBaseUrl(defaultIp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 일정 단건 조회
  const fetchSchedule = useCallback(
    async (scheduleId: string): Promise<Schedule | null> => {
      setLoading(true);
      setError(null);
      try {
        const schedule = await scheduleApi.getSchedule(baseUrl, ownerId, scheduleId);
        return schedule;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('일정 조회 실패');
        setError(error);
        console.error('[Schedule] 조회 실패:', error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 특정 날짜의 일정 목록 조회
  const fetchSchedulesByDay = useCallback(
    async (params: DayScheduleQueryParams): Promise<ScheduleListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await scheduleApi.getSchedulesByDay(baseUrl, ownerId, params);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('일정 목록 조회 실패');
        setError(error);
        console.error('[Schedule] 날짜별 조회 실패:', error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 전체 일정 목록 조회
  const fetchAllSchedules = useCallback(
    async (params?: ScheduleQueryParams): Promise<ScheduleListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await scheduleApi.getAllSchedules(baseUrl, ownerId, params);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('전체 일정 조회 실패');
        setError(error);
        console.error('[Schedule] 전체 조회 실패:', error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 월별 일정 조회
  const fetchSchedulesByMonth = useCallback(
    async (
      year: number,
      month: number,
      params?: ScheduleQueryParams
    ): Promise<ScheduleListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await scheduleApi.getSchedulesByMonth(
          baseUrl,
          ownerId,
          year,
          month,
          params
        );
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('월별 일정 조회 실패');
        setError(error);
        console.error('[Schedule] 월별 조회 실패:', error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 일정 생성
  const createSchedule = useCallback(
    async (data: CreateScheduleRequest): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await scheduleApi.createSchedule(baseUrl, ownerId, data);
        console.log('[Schedule] 생성 성공');
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('일정 생성 실패');
        setError(error);
        console.error('[Schedule] 생성 실패:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 일정 수정
  const updateSchedule = useCallback(
    async (data: UpdateScheduleRequest): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await scheduleApi.updateSchedule(baseUrl, ownerId, data);
        console.log('[Schedule] 수정 성공');
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('일정 수정 실패');
        setError(error);
        console.error('[Schedule] 수정 실패:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  // 일정 삭제
  const deleteSchedule = useCallback(
    async (data: DeleteScheduleRequest): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await scheduleApi.deleteSchedule(baseUrl, ownerId, data);
        console.log('[Schedule] 삭제 성공');
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('일정 삭제 실패');
        setError(error);
        console.error('[Schedule] 삭제 실패:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, ownerId]
  );

  return {
    loading,
    error,
    fetchSchedule,
    fetchSchedulesByDay,
    fetchAllSchedules,
    fetchSchedulesByMonth,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
