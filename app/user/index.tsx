import React from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, ScrollView, Linking, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

export default function UserHome(): JSX.Element {
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('auth_token');
            router.replace('/login');
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      {/* 상단 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>GrewMeet</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
            <Image source={require('../../assets/images/bell.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingTop: 0 }}>
          {/* 계정 섹션 */}
          <View style={{ backgroundColor: '#ffffff', marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f9fafb' }}>
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>계정</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/user/password')}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 24,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#111827' }}>비밀번호 변경</Text>
              <Text style={{ fontSize: 18, color: '#9ca3af' }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/user/notifications')}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 24,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#111827' }}>푸시 알림 설정</Text>
              <Text style={{ fontSize: 18, color: '#9ca3af' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 고객 지원 섹션 */}
          <View style={{ backgroundColor: '#ffffff', marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f9fafb' }}>
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>고객 지원</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/user/notice')}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 24,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: '#111827' }}>공지사항</Text>
              <Text style={{ fontSize: 18, color: '#9ca3af' }}>›</Text>
            </TouchableOpacity>
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 24,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: '#111827' }}>이메일 문의하기</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>이용 시 불편 사항 및 제안</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 12 }}>dongyeopwoo1@gmail.com</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 24,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: '#111827' }}>스폰서</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>광고 문의</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 12 }}>dongyeopwoo1@gmail.com</Text>
            </View>
          </View>

          {/* 로그아웃 */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={{
              backgroundColor: '#ffffff',
              paddingHorizontal: 20,
              paddingVertical: 24,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 16, color: '#ef4444', fontWeight: '600' }}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

