import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Meeting } from '../types';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  meetingList: Meeting[];
  styles: any;
}

export const ScheduleModal = ({ 
  visible, 
  onClose, 
  meetingList,
  styles 
}: ScheduleModalProps): JSX.Element => (
  <Modal
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
    animationType="none"
  >
    <View style={styles.modalOverlay}>
      <View style={[styles.centerModalContent, styles.scheduleModalContent]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>스터디 일정</Text>
          <TouchableOpacity 
            style={styles.closeButtonContainer}
            onPress={onClose}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scheduleList}>
          {meetingList.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#888', fontSize: 16 }}>예정된 일정이 없습니다.</Text>
            </View>
          ) : (
            meetingList.map((meeting) => (
              <View key={meeting.id} style={styles.scheduleItem}>
                <View style={styles.scheduleItemHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.scheduleDate}>{meeting.studyRoomName || ''}</Text>
                  </View>
                </View>
                <View style={styles.scheduleItemContent}>
                  <View style={styles.scheduleTimeContainer}>
                    <Text style={styles.scheduleTime}>{meeting.meetingTime ? meeting.meetingTime.slice(11, 16) : ''}</Text>
                    <View style={styles.scheduleTimeLine} />
                  </View>
                  <View style={styles.scheduleMainContent}>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleItemTitle}>{meeting.title}</Text>
                      <View style={styles.scheduleMetaInfo}>
                        <View style={styles.scheduleStatusBadge}>
                          <Text style={styles.scheduleStatusText}>진행 예정</Text>
                        </View>
                        <Text style={styles.scheduleDuration}>{meeting.duration ? `${meeting.duration}분` : ''}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

