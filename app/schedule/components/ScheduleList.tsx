import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { Schedule } from '../types';
import { ScheduleCard } from './ScheduleCard';
import { formatKoreanDate, isSameDay } from '../utils/dateFormatter';

interface ScheduleListProps {
  schedules: Schedule[];
  loading?: boolean;
  onSchedulePress?: (schedule: Schedule) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  emptyMessage?: string;
}

export function ScheduleList({
  schedules,
  loading = false,
  onSchedulePress,
  onRefresh,
  refreshing = false,
  emptyMessage = '일정이 없습니다',
}: ScheduleListProps): JSX.Element {
  // 날짜별로 일정 그룹화
  const groupedSchedules = React.useMemo(() => {
    const groups: { date: string; schedules: Schedule[] }[] = [];
    const dateMap = new Map<string, Schedule[]>();

    schedules.forEach((schedule) => {
      const dateKey = new Date(schedule.startAt).toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)?.push(schedule);
    });

    dateMap.forEach((schedules, dateKey) => {
      groups.push({
        date: dateKey,
        schedules: schedules.sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      });
    });

    return groups.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [schedules]);

  if (loading && schedules.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={groupedSchedules}
      keyExtractor={(item) => item.date}
      renderItem={({ item }) => (
        <View style={styles.dateSection}>
          <Text style={styles.dateHeader}>{formatKoreanDate(item.date)}</Text>
          {item.schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onPress={() => onSchedulePress?.(schedule)}
            />
          ))}
        </View>
      )}
      contentContainerStyle={styles.listContent}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    paddingVertical: 8,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
});
