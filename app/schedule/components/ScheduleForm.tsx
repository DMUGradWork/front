import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import type { ScheduleFormData } from '../types';
import { formatKoreanDateTime } from '../utils/dateFormatter';

interface ScheduleFormProps {
  initialData?: Partial<ScheduleFormData>;
  onSubmit: (data: ScheduleFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export function ScheduleForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '저장',
  loading = false,
}: ScheduleFormProps): JSX.Element {
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startAt: initialData?.startAt || new Date(),
    endAt: initialData?.endAt || new Date(Date.now() + 60 * 60 * 1000), // 1시간 후
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요');
      return;
    }

    if (formData.startAt >= formData.endAt) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다');
      return;
    }

    onSubmit(formData);
  };

  const adjustStartTime = (hours: number) => {
    const newStartAt = new Date(formData.startAt);
    newStartAt.setHours(newStartAt.getHours() + hours);
    setFormData({ ...formData, startAt: newStartAt });
  };

  const adjustEndTime = (hours: number) => {
    const newEndAt = new Date(formData.endAt);
    newEndAt.setHours(newEndAt.getHours() + hours);
    setFormData({ ...formData, endAt: newEndAt });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 제목 */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>제목 *</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="일정 제목을 입력하세요"
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      {/* 설명 */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="일정 설명을 입력하세요 (선택)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!loading}
        />
      </View>

      {/* 시작 시간 */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>시작 시간 *</Text>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{formatKoreanDateTime(formData.startAt)}</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustStartTime(-1)}
              disabled={loading}
            >
              <Text style={styles.adjustButtonText}>-1h</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustStartTime(1)}
              disabled={loading}
            >
              <Text style={styles.adjustButtonText}>+1h</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 종료 시간 */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>종료 시간 *</Text>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{formatKoreanDateTime(formData.endAt)}</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustEndTime(-1)}
              disabled={loading}
            >
              <Text style={styles.adjustButtonText}>-1h</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustEndTime(1)}
              disabled={loading}
            >
              <Text style={styles.adjustButtonText}>+1h</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 버튼 그룹 */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>{loading ? '처리 중...' : submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dateTimeContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateTimeText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  adjustButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
