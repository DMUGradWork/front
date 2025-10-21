import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Schedule } from '../types';
import {
  formatKoreanTime,
  formatTimeRange,
  calculateDurationInMinutes,
  formatDuration,
} from '../utils/dateFormatter';
import { getSourceLabel, getSourceColor } from '../utils/getSourceLabel';

interface ScheduleCardProps {
  schedule: Schedule;
  onPress?: () => void;
}

export function ScheduleCard({ schedule, onPress }: ScheduleCardProps): JSX.Element {
  const duration = calculateDurationInMinutes(schedule.startAt, schedule.endAt);
  const sourceColor = getSourceColor(schedule.source);

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: sourceColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* 상단: 제목과 소스 */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {schedule.title}
        </Text>
        <View style={[styles.sourceBadge, { backgroundColor: sourceColor }]}>
          <Text style={styles.sourceText}>{getSourceLabel(schedule.source)}</Text>
        </View>
      </View>

      {/* 중간: 시간 정보 */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTimeRange(schedule.startAt, schedule.endAt)}</Text>
        <Text style={styles.durationText}>• {formatDuration(duration)}</Text>
      </View>

      {/* 하단: 설명 (있는 경우) */}
      {schedule.description && (
        <Text style={styles.description} numberOfLines={2}>
          {schedule.description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 13,
    color: '#777',
    marginTop: 8,
    lineHeight: 18,
  },
});
