import React, { useState, useEffect } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, ScrollView, Switch, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

interface NotificationSettings {
  allNotifications: boolean;
  studyNotifications: boolean;
  chatNotifications: boolean;
  scheduleNotifications: boolean;
  announcementNotifications: boolean;
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export default function NotificationSettingsScreen(): JSX.Element {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    allNotifications: true,
    studyNotifications: true,
    chatNotifications: true,
    scheduleNotifications: true,
    announcementNotifications: true,
  });

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
  }, []);

  // 설정 저장
  const saveSettings = async (newSettings: NotificationSettings): Promise<void> => {
    try {
      await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('[Notifications] 설정 저장 실패:', error);
    }
  };

  // 설정 불러오기
  const loadSettings = async (): Promise<void> => {
    try {
      const stored = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('[Notifications] 설정 불러오기 실패:', error);
    }
  };

  // 알림 권한 확인
  const checkNotificationPermissions = async (): Promise<void> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // 권한이 없으면 요청
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            '알림 권한 필요',
            '푸시 알림을 받으려면 알림 권한이 필요합니다. 설정에서 알림 권한을 허용해주세요.',
            [{ text: '확인' }]
          );
        }
      }
    } catch (error) {
      console.error('[Notifications] 권한 확인 실패:', error);
    }
  };

  // 전체 알림 토글
  const handleAllNotificationsToggle = (value: boolean): void => {
    const newSettings: NotificationSettings = {
      allNotifications: value,
      studyNotifications: value,
      chatNotifications: value,
      scheduleNotifications: value,
      announcementNotifications: value,
    };
    saveSettings(newSettings);
  };

  // 개별 알림 토글
  const handleToggle = (key: keyof NotificationSettings, value: boolean): void => {
    // 전체 알림이 꺼져있으면 다른 설정을 켤 수 없음
    if (!settings.allNotifications && value) {
      Alert.alert('알림', '전체 알림을 먼저 켜주세요.');
      return;
    }

    // 개별 알림만 변경 (전체 알림은 변경하지 않음)
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>푸시 알림 설정</Text>
      </View>

      {/* 알림 설정 리스트 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* 전체 알림 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>전체 알림</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>모든 알림을 한 번에 켜거나 끌 수 있습니다</Text>
            </View>
            <Switch
              value={settings.allNotifications}
              onValueChange={handleAllNotificationsToggle}
              trackColor={{ false: '#D1D5DB', true: '#111827' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 세부 알림 설정 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9FAFB' }}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>알림 종류</Text>
          </View>

          {/* 스터디 알림 */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#111827', marginBottom: 4 }}>스터디 알림</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>스터디 그룹 초대, 참여 요청 등</Text>
            </View>
            <Switch
              value={settings.studyNotifications}
              onValueChange={(value) => handleToggle('studyNotifications', value)}
              disabled={!settings.allNotifications}
              trackColor={{ false: '#D1D5DB', true: '#111827' }}
              thumbColor="#fff"
            />
          </View>

          {/* 채팅 알림 */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#111827', marginBottom: 4 }}>채팅 알림</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>새로운 메시지 알림</Text>
            </View>
            <Switch
              value={settings.chatNotifications}
              onValueChange={(value) => handleToggle('chatNotifications', value)}
              disabled={!settings.allNotifications}
              trackColor={{ false: '#D1D5DB', true: '#111827' }}
              thumbColor="#fff"
            />
          </View>

          {/* 스케줄 알림 */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#111827', marginBottom: 4 }}>스케줄 알림</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>일정, 모임 알림 등</Text>
            </View>
            <Switch
              value={settings.scheduleNotifications}
              onValueChange={(value) => handleToggle('scheduleNotifications', value)}
              disabled={!settings.allNotifications}
              trackColor={{ false: '#D1D5DB', true: '#111827' }}
              thumbColor="#fff"
            />
          </View>

          {/* 공지사항 알림 */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#111827', marginBottom: 4 }}>공지사항 알림</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>서비스 공지 및 업데이트</Text>
            </View>
            <Switch
              value={settings.announcementNotifications}
              onValueChange={(value) => handleToggle('announcementNotifications', value)}
              disabled={!settings.allNotifications}
              trackColor={{ false: '#D1D5DB', true: '#111827' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 안내 메시지 */}
        <View style={{ backgroundColor: '#F0F9FF', borderRadius: 12, padding: 16, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={20} color="#0369A1" style={{ marginRight: 8, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0369A1', marginBottom: 4 }}>알림 설정 안내</Text>
              <Text style={{ fontSize: 12, color: '#075985', lineHeight: 18 }}>
                전체 알림을 끄면 모든 알림이 비활성화됩니다.{'\n'}
                개별 알림 설정은 전체 알림이 켜져 있을 때만 변경할 수 있습니다.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

