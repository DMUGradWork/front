import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import type { Schedule, ScheduleFormData } from './types';
import { ScheduleList, ScheduleForm } from './components';
import { useSchedule } from './hooks';
import { toISO8601String } from './utils';

// 임시 사용자 ID (실제로는 인증 시스템에서 가져와야 함)
const TEMP_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

type ActiveView = 'list' | 'create' | 'detail';

export default function ScheduleHome(): JSX.Element {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const scheduleHook = useSchedule({ ownerId: TEMP_USER_ID });

  // 일정 목록 조회
  const loadSchedules = useCallback(async () => {
    const response = await scheduleHook.fetchAllSchedules({ size: 100 });
    if (response) {
      setSchedules(response.content);
    }
  }, [scheduleHook]);

  // 초기 로드
  useEffect(() => {
    loadSchedules();
  }, []);

  // 일정 생성
  const handleCreateSchedule = async (data: ScheduleFormData) => {
    const success = await scheduleHook.createSchedule({
      title: data.title,
      description: data.description || undefined,
      startAt: toISO8601String(data.startAt),
      endAt: toISO8601String(data.endAt),
    });

    if (success) {
      Alert.alert('성공', '일정이 생성되었습니다');
      setActiveView('list');
      // 목록 새로고침 (이벤트 프로젝션 대기 시간 고려)
      setTimeout(() => loadSchedules(), 1000);
    } else {
      Alert.alert('실패', '일정 생성에 실패했습니다');
    }
  };

  // 일정 수정
  const handleUpdateSchedule = async (data: ScheduleFormData) => {
    if (!selectedSchedule) return;

    const success = await scheduleHook.updateSchedule({
      scheduleId: selectedSchedule.id,
      title: data.title,
      description: data.description || undefined,
      startAt: toISO8601String(data.startAt),
      endAt: toISO8601String(data.endAt),
    });

    if (success) {
      Alert.alert('성공', '일정이 수정되었습니다');
      setActiveView('list');
      setSelectedSchedule(null);
      setIsEditMode(false);
      setTimeout(() => loadSchedules(), 1000);
    } else {
      Alert.alert('실패', '일정 수정에 실패했습니다');
    }
  };

  // 일정 삭제
  const handleDeleteSchedule = () => {
    if (!selectedSchedule) return;

    Alert.alert('확인', '정말 이 일정을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const success = await scheduleHook.deleteSchedule({
            scheduleId: selectedSchedule.id,
          });

          if (success) {
            Alert.alert('성공', '일정이 삭제되었습니다');
            setActiveView('list');
            setSelectedSchedule(null);
            setTimeout(() => loadSchedules(), 1000);
          } else {
            Alert.alert('실패', '일정 삭제에 실패했습니다');
          }
        },
      },
    ]);
  };

  // 일정 카드 클릭
  const handleSchedulePress = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setActiveView('detail');
  };

  // 일정 목록 화면
  const renderListView = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>일정</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setActiveView('create')}
        >
          <Text style={styles.createButtonText}>+ 새 일정</Text>
        </TouchableOpacity>
      </View>
      <ScheduleList
        schedules={schedules}
        loading={scheduleHook.loading}
        onSchedulePress={handleSchedulePress}
        onRefresh={loadSchedules}
        refreshing={scheduleHook.loading}
      />
    </View>
  );

  // 일정 생성 화면
  const renderCreateView = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>새 일정</Text>
      </View>
      <ScheduleForm
        onSubmit={handleCreateSchedule}
        onCancel={() => setActiveView('list')}
        loading={scheduleHook.loading}
      />
    </View>
  );

  // 일정 상세 화면
  const renderDetailView = () => {
    if (!selectedSchedule) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setActiveView('list');
              setSelectedSchedule(null);
              setIsEditMode(false);
            }}
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>
          <View style={styles.detailActions}>
            {selectedSchedule.source === 'CUSTOM' && (
              <>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditMode(true)}
                >
                  <Text style={styles.editButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteSchedule}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {isEditMode ? (
          <ScheduleForm
            initialData={{
              title: selectedSchedule.title,
              description: selectedSchedule.description || '',
              startAt: new Date(selectedSchedule.startAt),
              endAt: new Date(selectedSchedule.endAt),
            }}
            onSubmit={handleUpdateSchedule}
            onCancel={() => setIsEditMode(false)}
            submitLabel="수정"
            loading={scheduleHook.loading}
          />
        ) : (
          <View style={styles.detailContent}>
            <Text style={styles.detailTitle}>{selectedSchedule.title}</Text>
            {selectedSchedule.description && (
              <Text style={styles.detailDescription}>{selectedSchedule.description}</Text>
            )}
            <View style={styles.detailInfo}>
              <Text style={styles.detailInfoLabel}>시작:</Text>
              <Text style={styles.detailInfoValue}>
                {new Date(selectedSchedule.startAt).toLocaleString('ko-KR')}
              </Text>
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailInfoLabel}>종료:</Text>
              <Text style={styles.detailInfoValue}>
                {new Date(selectedSchedule.endAt).toLocaleString('ko-KR')}
              </Text>
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailInfoLabel}>소스:</Text>
              <Text style={styles.detailInfoValue}>{selectedSchedule.source}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {activeView === 'list' && renderListView()}
      {activeView === 'create' && renderCreateView()}
      {activeView === 'detail' && renderDetailView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#E94B8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailContent: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailInfoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    width: 60,
  },
  detailInfoValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
});

