import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 💡 추가: useSafeAreaInsets를 가져옵니다.
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useApiBaseUrl } from './study/hooks/useApiBaseUrl';

// auth-service는 Docker로 포트 8082에서 실행 중
// IP는 자동으로 감지되며, tunnel을 사용하는 경우 환경 변수나 설정에서 URL을 변경하세요

export default function Main(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const [name, setName] = useState((params.name as string) || '사용자');
  const screenHeight = Dimensions.get('window').height;
  // auth-service base URL (포트 8082)
  const baseUrl = useApiBaseUrl('172.16.113.138', 8082);
  
  useEffect(() => {
    // params에서 name이 있으면 그대로 사용, 없으면 토큰으로 조회
    if (params.name) {
      return;
    }
    
    const fetchUserInfo = async (): Promise<void> => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) {
          router.replace('/login');
          return;
        }
        
        // 토큰에서 userId 추출 (간단한 방법)
        try {
          const payloadPart = token.split('.')[1];
          if (payloadPart) {
            let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
              base64 += '=';
            }
            
            let jsonString = '';
            if (typeof atob !== 'undefined') {
              jsonString = atob(base64);
            } else {
              const Buffer = require('buffer').Buffer;
              jsonString = Buffer.from(base64, 'base64').toString('utf-8');
            }
            
            const json = JSON.parse(jsonString);
            const userId = json?.userId || json?.sub;
            
            if (userId) {
              const userRes = await axios.get(`${baseUrl}/auth/users/${encodeURIComponent(userId)}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const nameFromDb = userRes?.data?.name;
              if (nameFromDb) {
                setName(nameFromDb);
              }
            }
          }
        } catch (e) {
          console.log('Token decode error:', e);
        }
      } catch (e) {
        console.log('Fetch user error:', e);
      }
    };
    
    fetchUserInfo();
  }, [params.name, router, baseUrl]);
  
  // 💡 추가: useSafeAreaInsets 훅 호출
  const insets = useSafeAreaInsets(); 

  return (
    // 1. 배경색을 #111827로 유지하고, 하단 패딩은 제거하여 콘텐츠를 바닥까지 확장
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }} edges={['top', 'left', 'right']}>
      <StatusBar style="light" translucent backgroundColor="#111827" />
      <View style={{ flex: 1 }}>
        
        {/* 상단 헤더 (배경 + 정보) */}
        <View style={{ backgroundColor: '#111827', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 70, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, minHeight: screenHeight * 0.38, justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 25, fontWeight: '800', marginBottom: 20 }}>{name}님</Text>
          <Text style={{ color: '#e6fffb', fontSize: 13, marginBottom: 8 }}>2025. 11. 27(목) 오후 03:00에</Text>
          <Text style={{ color: '#e6fffb', fontSize: 13, marginBottom: 12 }}>예약되어 있습니다. 아래 버튼을 눌러 일정을 확인해보세요.</Text>
          <TouchableOpacity activeOpacity={0.9} style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,top: 10 }}>
            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>일정 확인 ›</Text>
          </TouchableOpacity>
        </View>

        {/* 버튼 그리드 - 하단 영역은 화이트 배경 유지 */}
        <View style={{ flex: 1, backgroundColor: '#ffffff', position: 'relative' }}>
          <View style={{ flex: 1, justifyContent: 'center', marginTop: -screenHeight * 0.44 }}>
            <View style={{ marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {/* 1. 소개팅 */}
              <TouchableOpacity activeOpacity={0.9} style={{ width: '48%', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 22, minHeight: 240, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7', justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }} onPress={() => router.push('/dating')}>
                <Image source={require('../assets/images/dating.png')} style={{ width: 56, height: 56, marginBottom: 20 }} resizeMode="contain" />
                <Text style={{ color: '#111827', fontSize: 23, fontWeight: '600', marginBottom: 2, textAlign: 'center' }}>소개팅</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, top: 10, textAlign: 'center' }}>새로운 인연을 만나보세요</Text>
              </TouchableOpacity>

              {/* 2. 공부 */}
              <TouchableOpacity activeOpacity={0.9} style={{ width: '48%', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 22, minHeight: 240, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7', justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }} onPress={() => router.push('/study')}>
                <Image source={require('../assets/images/study.png')} style={{ width: 56, height: 56, marginBottom: 20 }} resizeMode="contain" />
                <Text style={{ color: '#111827', fontSize: 23, fontWeight: '600', marginBottom: 2, textAlign: 'center' }}>공부</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, top: 10, textAlign: 'center' }}>스터디를 관리하고 기록해요</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* 광고 컨테이너 */}
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 100 + insets.bottom + 12, height: 170, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#ffffff', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ flex: 1 }}
              onPress={() => Linking.openURL('https://www.samsungebiz.com/event/galaxycampus/gcseventhub/')}
            >
              <Image source={require('../assets/images/sam.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
          </View>

          {/* 하단 바: 홈 / 설정 */}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
            {/* 2. 수정: useSafeAreaInsets로 가져온 정확한 하단 여백(insets.bottom)을 paddingBottom에 적용 */}
            <View style={{ flexDirection: 'row', paddingVertical: 10, paddingBottom: 10 + insets.bottom }}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.replace('/main')} style={{ flex: 1, alignItems: 'center' }}>
                <Image source={require('../assets/images/home.png')} style={{ width: 22, height: 22, marginBottom: 4 }} resizeMode="contain" />
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '600' }}>홈</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/user')} style={{ flex: 1, alignItems: 'center' }}>
                <Image source={require('../assets/images/more.png')} style={{ width: 22, height: 22, marginBottom: 4 }} resizeMode="contain" />
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '600' }}>더보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}