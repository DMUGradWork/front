import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Swipeable } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { useApiBaseUrl } from '../study/hooks/useApiBaseUrl';
import { REGIONS } from '../study/utils/regions';
import { styles } from '../study/styles';

// 타입 정의
type DatingEvent = {
  meetingUuid: string;
  title: string;
  description: string;
  hostAuthUserId: string;
  hostNickname: string;
  meetingDateTime: string;
  location: string;
  maxMaleParticipants: number;
  maxFemaleParticipants: number;
  currentMaleParticipants: number;
  currentFemaleParticipants: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type EventParticipant = {
  meetingUuid: string;
  authUserId: string;
  gender: string;
  status: string;
  joinedAt: string;
  leftAt?: string;
};

const DatingApp = (): JSX.Element => {
  // API 엔드포인트
  const QUERY_BASE_URL = useApiBaseUrl('172.16.113.138', 8086);
  const COMMAND_BASE_URL = useApiBaseUrl('172.16.113.138', 8085);
  const AUTH_BASE_URL = useApiBaseUrl('172.16.113.138', 8082);
  const CHAT_BASE_URL = useApiBaseUrl('172.16.113.138', 8080); // study-group-service의 채팅 API 사용

  // 디버깅: API URL 확인
  useEffect(() => {
    console.log('API Base URLs:', {
      QUERY: QUERY_BASE_URL,
      COMMAND: COMMAND_BASE_URL,
      AUTH: AUTH_BASE_URL,
    });
  }, []);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(20)).current;
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [eventList, setEventList] = useState<DatingEvent[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<DatingEvent[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<DatingEvent | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEventDetail, setShowEventDetail] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // 채팅방 관련 상태
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'chat' | 'chat-list'>('dashboard');
  const [activeChat, setActiveChat] = useState<{ chatRoomId: number | null; eventName: string; eventUuid: string | null; eventHostId: string | null }>({
    chatRoomId: null,
    eventName: '',
    eventUuid: null,
    eventHostId: null,
  });
  const [chatEntrySource, setChatEntrySource] = useState<'event' | 'chat-list'>('event');
  
  // 참여 모달 상태
  const [joinModal, setJoinModal] = useState<{ visible: boolean; event: DatingEvent | null }>({ visible: false, event: null });
  const [joinLoading, setJoinLoading] = useState<boolean>(false);

  // 이벤트 생성 폼
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    meetingDateTime: '',
    location: '',
    maxMaleParticipants: '10',
    maxFemaleParticipants: '10',
  });

  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showCityPicker, setShowCityPicker] = useState<boolean>(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  // 디버깅: 모달 상태 변경 추적
  useEffect(() => {
    console.log('showCityPicker 상태 변경:', showCityPicker);
  }, [showCityPicker]);

  useEffect(() => {
    console.log('showDistrictPicker 상태 변경:', showDistrictPicker);
  }, [showDistrictPicker]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async (): Promise<void> => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) return;
        
        try {
          const payloadPart = token.split('.')[1];
          if (!payloadPart) return;
          
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
          const userId = json?.userId;
          // JWT에서 UUID 추출 시도 (일반적으로 UUID는 sub 또는 uuid 필드에 있음)
          const jwtUuid = json?.sub || json?.uuid || json?.userId;
          
          if (userId) {
            const userRes = await axios.get(`${AUTH_BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            console.log('사용자 정보 응답:', userRes.data);
            console.log('JWT 페이로드:', json);

            // UUID 형식의 ID를 찾기 (우선순위: userRes.data.uuid -> JWT의 uuid -> JWT의 sub)
            let userUuid = userRes.data.uuid;
            
            // UUID 형식 검증 (8-4-4-4-12 형식)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            // UUID가 없거나 UUID 형식이 아닌 경우
            if (!userUuid || !uuidRegex.test(String(userUuid))) {
              // JWT에서 UUID 추출 시도
              const jwtUuidValue = json?.uuid || json?.sub;
              if (jwtUuidValue && uuidRegex.test(String(jwtUuidValue))) {
                userUuid = jwtUuidValue;
              } else {
                console.error('⚠️ UUID를 찾을 수 없습니다.');
                console.error('userId:', userRes.data.userId);
                console.error('userRes.data:', userRes.data);
                console.error('JWT:', json);
                
                // userId가 UUID 형식이 아닌 경우, 에러 메시지 표시
                alert('사용자 UUID를 찾을 수 없습니다. auth-service에서 UUID를 제공해야 합니다.');
                return;
              }
            }
            
            // UUID를 문자열로 변환 (UUID 객체인 경우)
            const uuidString = String(userUuid);
            console.log('✅ 사용할 UUID:', uuidString);

            setUserInfo({
              id: uuidString, // UUID 형식 사용
              userId: userRes.data.userId, // 원본 userId도 저장
              name: userRes.data.name,
              email: userRes.data.email,
            });
          }
        } catch (e) {
          console.log('Token decode error:', e);
        }
      } catch (e) {
        console.log('Fetch user error:', e);
      }
    };
    
    fetchUserInfo();
  }, []);

  // 이벤트 목록 가져오기
  const fetchEventList = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('이벤트 목록 조회 시작:', `${QUERY_BASE_URL}/events`);
      const response = await axios.get(`${QUERY_BASE_URL}/events`, {
        params: { page: 0, size: 100 },
      });
      console.log('API 응답 전체:', JSON.stringify(response.data, null, 2));
      console.log('응답 데이터 타입:', typeof response.data);
      console.log('content 필드:', response.data.content);
      console.log('content 타입:', typeof response.data.content);
      console.log('content 배열 여부:', Array.isArray(response.data.content));
      
      const events = response.data.content || [];
      console.log('이벤트 목록 조회 결과:', events.length, '개');
      console.log('이벤트 목록:', events);
      
      if (events.length > 0) {
        console.log('첫 번째 이벤트:', events[0]);
      }
      
      // 기존 이벤트 목록과 병합 (optimistic update로 추가한 이벤트 유지)
      setEventList(prev => {
        const existingUuids = new Set(events.map((e: any) => e.meetingUuid));
        const optimisticEvents = prev.filter(e => !existingUuids.has(e.meetingUuid));
        const merged = [...optimisticEvents, ...events];
        console.log('🔄 fetchEventList 병합:', {
          prevCount: prev.length,
          serverCount: events.length,
          optimisticCount: optimisticEvents.length,
          mergedCount: merged.length,
          optimisticUuids: optimisticEvents.map((e: any) => e.meetingUuid),
        });
        return merged;
      });
      
      // 추천 이벤트는 최신 5개
      setRecommendedEvents(prev => {
        const existingUuids = new Set(events.map((e: any) => e.meetingUuid));
        const optimisticEvents = prev.filter(e => !existingUuids.has(e.meetingUuid));
        const merged = [...optimisticEvents, ...events];
        const recommended = merged.slice(0, 5);
        console.log('추천 이벤트 설정:', recommended.length, '개');
        return recommended;
      });
    } catch (err: any) {
      console.error('이벤트 목록 가져오기 실패:', err);
      console.error('에러 응답:', err.response?.data);
      console.error('에러 상태:', err.response?.status);
      console.error('에러 메시지:', err.message);
      // 에러 발생 시에도 optimistic update는 유지
      // setEventList([]);
      // setRecommendedEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 검색
  const handleSearch = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get(`${QUERY_BASE_URL}/events/search`, {
        params: {
          keyword: searchText || undefined,
          location: selectedLocation !== 'all' ? selectedLocation : undefined,
          page: 0,
          size: 100,
        },
      });
      const events = response.data.content || [];
      setEventList(events);
      setShowSearchModal(false);
    } catch (err) {
      console.error('검색 실패:', err);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 이벤트 상세 가져오기
  const fetchEventDetail = async (meetingUuid: string): Promise<void> => {
    try {
      const [eventRes, participantsRes] = await Promise.all([
        axios.get(`${QUERY_BASE_URL}/events/${meetingUuid}`),
        axios.get(`${QUERY_BASE_URL}/events/${meetingUuid}/participants`),
      ]);
      setSelectedEvent(eventRes.data);
      setParticipants(participantsRes.data.content || []);
      setShowEventDetail(true);
    } catch (err) {
      console.error('이벤트 상세 가져오기 실패:', err);
      alert('이벤트 정보를 불러올 수 없습니다.');
    }
  };

  // 이벤트 참여 (참여 모달에서 사용)
  const handleJoinEvent = async (): Promise<void> => {
    if (!joinModal.event || !userInfo) {
      return;
    }

    setJoinLoading(true);
    try {
      await axios.post(
        `${COMMAND_BASE_URL}/events/${joinModal.event.meetingUuid}/participants`,
        {},
        {
          headers: {
            'X-User-Id': userInfo.id,
          },
        }
      );
      
      // 참여 성공 시 채팅방 생성 확인 및 채팅 화면 이동
      // 백엔드에서 채팅방을 생성했다고 가정하고, 이벤트 UUID를 기반으로 채팅방 ID 조회
      // 스터디 공간과 동일하게 study-group-service의 채팅 API 사용
      // 이벤트 UUID를 기반으로 채팅방 ID를 생성하거나 조회
      // 임시로 이벤트 UUID의 해시값을 사용하여 채팅방 ID 생성
      const chatRoomId = Math.abs(joinModal.event.meetingUuid.split('-').reduce((acc, val) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
      
      setJoinModal({ visible: false, event: null });
      setActiveScreen('chat');
      setActiveChat({
        chatRoomId: chatRoomId,
        eventName: joinModal.event.title,
        eventUuid: joinModal.event.meetingUuid,
        eventHostId: joinModal.event.hostAuthUserId,
      });
      setChatEntrySource('event');
      
      fetchEventList();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '참여에 실패했습니다.';
      alert(errorMsg);
    } finally {
      setJoinLoading(false);
    }
  };

  // 이벤트 탈퇴
  const handleLeaveEvent = async (meetingUuid: string, participantId: string): Promise<void> => {
    if (!userInfo) return;

    try {
      await axios.delete(`${COMMAND_BASE_URL}/events/${meetingUuid}/participants/${participantId}`);
      alert('이벤트에서 탈퇴했습니다.');
      fetchEventDetail(meetingUuid);
      fetchEventList();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '탈퇴에 실패했습니다.';
      alert(errorMsg);
    }
  };

  // 이벤트 생성
  const handleCreateEvent = async (): Promise<void> => {
    if (!userInfo) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!eventForm.title || !eventForm.description || !eventForm.location) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      // meetingDateTime을 현재 시간으로부터 1일 후로 설정
      const meetingDateTime = new Date();
      meetingDateTime.setDate(meetingDateTime.getDate() + 1);
      meetingDateTime.setHours(14, 0, 0, 0); // 오후 2시로 설정

      console.log('이벤트 생성 요청:', {
        url: `${COMMAND_BASE_URL}/events`,
        userId: userInfo.id,
        title: eventForm.title,
        location: eventForm.location,
        meetingDateTime: meetingDateTime.toISOString(),
      });

      const response = await axios.post(
        `${COMMAND_BASE_URL}/events`,
        {
          title: eventForm.title,
          description: eventForm.description,
          meetingDateTime: meetingDateTime.toISOString(),
          location: eventForm.location,
          maxMaleParticipants: parseInt(eventForm.maxMaleParticipants, 10),
          maxFemaleParticipants: parseInt(eventForm.maxFemaleParticipants, 10),
        },
        {
          headers: {
            'X-User-Id': userInfo.id,
          },
        }
      );

      console.log('이벤트 생성 성공:', response.data);
      console.log('응답 데이터 구조:', JSON.stringify(response.data, null, 2));
      
      const meetingUuid = response.data.meetingUuid || response.data.id;
      
      // 호스트를 자동으로 참여시킴 (UUID 지원)
      try {
        await axios.post(
          `${COMMAND_BASE_URL}/events/${meetingUuid}/participants`,
          {},
          {
            headers: {
              'X-User-Id': userInfo.id,
            },
          }
        );
        console.log('✅ 호스트 자동 참여 성공');
      } catch (joinErr: any) {
        // 409 Conflict는 "이미 참여 중"을 의미하므로 성공으로 간주
        if (joinErr.response?.status === 409) {
          console.log('✅ 호스트가 이미 참여 중 (409 Conflict - 정상)');
        } else {
          console.error('⚠️ 호스트 자동 참여 실패:', joinErr.response?.status, joinErr.message);
          // 참여 실패해도 이벤트는 생성되었으므로 계속 진행
        }
      }
      
      // 생성된 이벤트를 즉시 목록에 추가 (Optimistic Update)
      // response.data는 DatingMeetingResponse 객체
      const newEvent = {
        meetingUuid: meetingUuid,
        title: response.data.title,
        description: response.data.description,
        meetingDateTime: response.data.meetingDateTime || response.data.meetingDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: response.data.location,
        maxMaleParticipants: response.data.maxMaleParticipants || response.data.maxMaleParticipantCount || 10,
        maxFemaleParticipants: response.data.maxFemaleParticipants || response.data.maxFemaleParticipantCount || 10,
        currentMaleParticipants: 0,
        currentFemaleParticipants: 0,
        hostAuthUserId: userInfo.id,
        hostNickname: userInfo.name || '나',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('생성된 이벤트 객체:', newEvent);
      
      // 목록에 추가 (최신순으로 앞에 추가)
      setEventList(prev => {
        const updated = [newEvent, ...prev];
        console.log('✅ Optimistic Update - 이벤트 목록에 추가:', {
          meetingUuid: newEvent.meetingUuid,
          title: newEvent.title,
          totalCount: updated.length,
          prevCount: prev.length,
        });
        return updated;
      });
      setRecommendedEvents(prev => {
        const updated = [newEvent, ...prev.slice(0, 4)];
        console.log('✅ Optimistic Update - 추천 이벤트에 추가:', {
          meetingUuid: newEvent.meetingUuid,
          title: newEvent.title,
          totalCount: updated.length,
        });
        return updated;
      });
      
      // 모달 닫기 및 폼 초기화
      setShowCreateModal(false);
      setSelectedCity('');
      setSelectedDistrict('');
      setEventForm({
        title: '',
        description: '',
        meetingDateTime: '',
        location: '',
        maxMaleParticipants: '10',
        maxFemaleParticipants: '10',
      });
      
      // 채팅방 ID 생성
      const chatRoomId = Math.abs(meetingUuid.split('-').reduce((acc: number, val: string) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
      
      // 생성된 이벤트의 채팅방으로 바로 이동
      setActiveChat({
        chatRoomId: chatRoomId,
        eventName: response.data.title,
        eventUuid: meetingUuid,
        eventHostId: userInfo.id,
      });
      setChatEntrySource('event');
      setActiveScreen('chat');
      
      // optimistic update로 이미 추가했으므로 fetchEventList() 호출하지 않음
      // 사용자가 수동으로 새로고침하거나, query-service에 전파된 후 자동으로 동기화됨
    } catch (err: any) {
      console.error('이벤트 생성 에러:', err);
      console.error('에러 응답:', err.response?.data);
      console.error('에러 상태:', err.response?.status);
      console.error('에러 메시지:', err.message);
      
      let errorMsg = '이벤트 생성에 실패했습니다.';
      
      if (err.response?.data) {
        // 백엔드에서 반환한 에러 메시지
        if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      // 네트워크 에러인 경우
      if (err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR') {
        errorMsg = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
      }
      
      alert(`오류: ${errorMsg}\n\n상태 코드: ${err.response?.status || 'N/A'}`);
    }
  };

  // 내 참여 이벤트 가져오기
  const fetchMyEvents = async (): Promise<void> => {
    if (!userInfo) return;

    try {
      setLoading(true);
      const response = await axios.get(`${QUERY_BASE_URL}/users/me/events`, {
        params: { page: 0, size: 100 },
        headers: {
          'X-User-Id': userInfo.id,
        },
      });
      const events = response.data.content || [];
      setEventList(events);
    } catch (err) {
      console.error('내 이벤트 가져오기 실패:', err);
      setEventList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchEventList();
  }, []);

  // 화면 진입 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(screenSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 시간 유틸리티 함수
  const getTimeAgo = (dateString: string): string => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // 초 단위
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  // 날짜 포맷팅
  const formatDateTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    return `${year}년 ${month}월 ${day}일(${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}) ${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // 위치 필터링된 이벤트 목록
  const filteredEvents = selectedLocation === 'all'
    ? eventList
    : eventList.filter(event => event.location.includes(selectedLocation));

  // Dashboard 화면
  const DashboardScreen = (): JSX.Element => {
  return (
      <View style={[styles.dashboardContainer, { backgroundColor: '#fafafa' }]}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchEventList} tintColor="#FF6B9D" />
          }
        >
          {/* 상단 그라데이션 헤더 */}
          <View style={{
            backgroundColor: '#fff',
            paddingTop: 40,
            paddingBottom: 30,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={[styles.mainTitleContainer, { alignItems: 'center' }]}>
              <View style={{ justifyContent: 'center' }}>
                <Text style={[styles.mainTitle, { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 }]}>
                  소개팅 공간
                </Text>
                <Text style={{ fontSize: 14, color: '#999', fontWeight: '500' }}>
                  새로운 인연을 만나보세요 💕
                </Text>
              </View>
              <View style={[styles.headerIcons, { alignItems: 'center' }]}>
                <TouchableOpacity
                  onPress={() => setActiveScreen('chat-list')}
                  style={[styles.iconButton, { 
                    marginRight: 12, 
                    backgroundColor: '#fff',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }]}
                >
                  <Ionicons name="chatbubbles-outline" size={22} color="#FF6B9D" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSearchModal(true)}
                  style={[styles.iconButton, { 
                    marginRight: 12,
                    backgroundColor: '#fff',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }]}
                >
                  <Ionicons name="search-outline" size={22} color="#FF6B9D" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={[styles.iconButton, {
                    backgroundColor: '#FF6B9D',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#FF6B9D',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }]}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 위치 필터 */}
          <View style={[styles.categoryContainer, { marginTop: 20, marginBottom: 10 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                onPress={() => setSelectedLocation('all')}
        style={[
                  {
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    marginRight: 10,
                    borderRadius: 20,
                    backgroundColor: selectedLocation === 'all' ? '#FF6B9D' : '#fff',
                    borderWidth: 1,
                    borderColor: selectedLocation === 'all' ? '#FF6B9D' : '#e5e7eb',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedLocation === 'all' ? 0.15 : 0.05,
                    shadowRadius: 4,
                    elevation: selectedLocation === 'all' ? 3 : 1,
                  }
        ]}
      >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: selectedLocation === 'all' ? '700' : '500',
                    color: selectedLocation === 'all' ? '#fff' : '#666',
                  }}
                >
                  전체
                </Text>
              </TouchableOpacity>
              {Object.keys(REGIONS).map(city => (
                <TouchableOpacity
                  key={city}
                  onPress={() => setSelectedLocation(city)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    marginRight: 10,
                    borderRadius: 20,
                    backgroundColor: selectedLocation === city ? '#FF6B9D' : '#fff',
                    borderWidth: 1,
                    borderColor: selectedLocation === city ? '#FF6B9D' : '#e5e7eb',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedLocation === city ? 0.15 : 0.05,
                    shadowRadius: 4,
                    elevation: selectedLocation === city ? 3 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: selectedLocation === city ? '700' : '500',
                      color: selectedLocation === city ? '#fff' : '#666',
                    }}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 추천 이벤트 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천 이벤트</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
              {recommendedEvents.length > 0 ? (
                recommendedEvents.map(event => (
                  <TouchableOpacity
                    key={event.meetingUuid}
                    activeOpacity={0.9}
                    style={{
                      width: 280,
                      marginRight: 16,
                      backgroundColor: '#fff',
                      borderRadius: 20,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.12,
                      shadowRadius: 12,
                      elevation: 5,
                    }}
                    onPress={async () => {
                      // 호스트인 경우 바로 채팅방으로 이동
                      const isHost = userInfo && event.hostAuthUserId === userInfo.id;
                      
                      if (isHost) {
                        // 호스트인 경우 채팅방으로 이동
                        const chatRoomId = Math.abs(event.meetingUuid.split('-').reduce((acc, val) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
                        setActiveScreen('chat');
                        setActiveChat({
                          chatRoomId: chatRoomId,
                          eventName: event.title,
                          eventUuid: event.meetingUuid,
                          eventHostId: event.hostAuthUserId,
                        });
                        setChatEntrySource('event');
                      } else {
                        // 참여 여부 확인을 위해 이벤트 상세 정보 가져오기
                        try {
                          const participantsRes = await axios.get(`${QUERY_BASE_URL}/events/${event.meetingUuid}/participants`);
                          const participantsList = participantsRes.data.content || [];
                          const isParticipant = participantsList.some(p => p.authUserId === userInfo?.id && p.status === 'ACTIVE');
                          
                          if (isParticipant) {
                            // 이미 참여한 경우 채팅방으로 이동
                            const chatRoomId = Math.abs(event.meetingUuid.split('-').reduce((acc, val) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
                            setActiveScreen('chat');
                            setActiveChat({
                              chatRoomId: chatRoomId,
                              eventName: event.title,
                              eventUuid: event.meetingUuid,
                              eventHostId: event.hostAuthUserId,
                            });
                            setChatEntrySource('event');
                          } else {
                            // 참여 모달 표시
                            setJoinModal({ visible: true, event });
                          }
                        } catch (err) {
                          console.error('참여 여부 확인 실패:', err);
                          // 에러 발생 시 참여 모달 표시
                          setJoinModal({ visible: true, event });
                        }
                      }
                    }}
                  >
                    {/* 그라데이션 이미지 영역 */}
                    <View style={{
                      height: 180,
                      backgroundColor: '#FF6B9D',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                    }}>
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 107, 157, 0.1)',
                      }} />
                      <Text style={{ fontSize: 48 }}>💕</Text>
                      {event.location && (
                        <View style={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 12,
                          backdropFilter: 'blur(10px)',
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{event.location}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* 카드 내용 */}
                    <View style={{ padding: 16 }}>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: '#1a1a1a',
                        marginBottom: 8,
                        lineHeight: 24,
                      }} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Ionicons name="time-outline" size={14} color="#999" />
                        <Text style={{ fontSize: 12, color: '#666', marginLeft: 6, flex: 1 }} numberOfLines={1}>
                          {formatDateTime(event.meetingDateTime)}
                        </Text>
                      </View>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#f0f0f0',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#4A90E2',
                            marginRight: 6,
                          }} />
                          <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>
                            남 {event.currentMaleParticipants}/{event.maxMaleParticipants}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#FF6B9D',
                            marginRight: 6,
                          }} />
                          <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>
                            여 {event.currentFemaleParticipants}/{event.maxFemaleParticipants}
                          </Text>
                        </View>
                      </View>
                    </View>
              </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.emptyCard, { width: 280, height: 200, borderRadius: 20 }]}>
                  <Ionicons name="heart-outline" size={48} color="#ddd" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyText}>추천 이벤트가 없습니다</Text>
                </View>
              )}
            </ScrollView>
            </View>

          {/* 광고 컨테이너 */}
          <View style={styles.adContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ flex: 1 }}
              onPress={() => Linking.openURL('https://www.samsungebiz.com/event/galaxycampus/gcseventhub/')}
            >
              <Image source={require('../../assets/images/ipad.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
          </View>

          {/* 전체 이벤트 목록 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>전체 이벤트</Text>
            </View>

            {loading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#999', fontSize: 14 }}>로딩 중...</Text>
                </View>
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <TouchableOpacity
                  key={event.meetingUuid}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 18,
                    marginBottom: 16,
                    marginHorizontal: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    borderLeftWidth: 4,
                    borderLeftColor: '#FF6B9D',
                  }}
                  onPress={() => {
                    // 호스트이거나 이미 참여한 경우 상세 화면으로 이동
                    const isHost = userInfo && event.hostAuthUserId === userInfo.id;
                    const isParticipant = participants.some(p => p.authUserId === userInfo?.id && p.status === 'ACTIVE');
                    
                    if (isHost || isParticipant) {
                      // 이미 참여한 경우 채팅방으로 이동
                      const chatRoomId = Math.abs(event.meetingUuid.split('-').reduce((acc, val) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
                      setActiveScreen('chat');
                      setActiveChat({
                        chatRoomId: chatRoomId,
                        eventName: event.title,
                        eventUuid: event.meetingUuid,
                        eventHostId: event.hostAuthUserId,
                      });
                      setChatEntrySource('event');
                    } else {
                      // 참여 모달 표시
                      setJoinModal({ visible: true, event });
                    }
                  }}
                >
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#1a1a1a',
                      marginBottom: 8,
                      lineHeight: 24,
                    }} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#666',
                      lineHeight: 20,
                      marginBottom: 12,
                    }} numberOfLines={2}>
                      {event.description}
                    </Text>
                  </View>
                
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{
                      backgroundColor: '#FFF0F5',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginRight: 8,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="location" size={12} color="#FF6B9D" />
                        <Text style={{ fontSize: 12, color: '#FF6B9D', marginLeft: 4, fontWeight: '600' }}>
                          {event.location}
                    </Text>
                  </View>
                    </View>
                    <View style={{
                      backgroundColor: '#F0F9FF',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time" size={12} color="#4A90E2" />
                        <Text style={{ fontSize: 12, color: '#4A90E2', marginLeft: 4, fontWeight: '600' }} numberOfLines={1}>
                          {formatDateTime(event.meetingDateTime)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#4A90E2',
                        marginRight: 6,
                      }} />
                      <Text style={{ fontSize: 13, color: '#666', fontWeight: '500' }}>
                        남 {event.currentMaleParticipants}/{event.maxMaleParticipants}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#FF6B9D',
                        marginRight: 6,
                      }} />
                      <Text style={{ fontSize: 13, color: '#666', fontWeight: '500' }}>
                        여 {event.currentFemaleParticipants}/{event.maxFemaleParticipants}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyCard, { marginTop: 40, padding: 40 }]}>
                <Ionicons name="heart-outline" size={48} color="#ddd" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>이벤트가 없습니다</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // 이벤트 상세 화면
  const EventDetailScreen = (): JSX.Element => {
    if (!selectedEvent) return <View />;

    const isHost = userInfo && selectedEvent.hostAuthUserId === userInfo.id;
    const isParticipant = participants.some(p => p.authUserId === userInfo?.id && p.status === 'ACTIVE');
    const myParticipant = participants.find(p => p.authUserId === userInfo?.id && p.status === 'ACTIVE');

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
        {/* 헤더 */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <TouchableOpacity
            onPress={() => setShowEventDetail(false)}
            style={{
              padding: 8,
              marginRight: 10,
              backgroundColor: '#f5f5f5',
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', flex: 1, color: '#1a1a1a' }}>이벤트 상세</Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* 상단 이미지 영역 */}
          <View style={{
            height: 200,
            backgroundColor: '#FF6B9D',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
            shadowColor: '#FF6B9D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 5,
          }}>
            <Text style={{ fontSize: 64 }}>💕</Text>
          </View>

          <Text style={{
            fontSize: 26,
            fontWeight: '800',
            marginBottom: 12,
            color: '#1a1a1a',
            lineHeight: 32,
          }}>{selectedEvent.title}</Text>
          <Text style={{
            fontSize: 15,
            color: '#666',
            marginBottom: 24,
            lineHeight: 22,
          }}>{selectedEvent.description}</Text>

          {/* 정보 카드들 */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFF0F5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="time" size={20} color="#FF6B9D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>일시</Text>
                <Text style={{ fontSize: 15, color: '#1a1a1a', fontWeight: '600' }}>
                  {formatDateTime(selectedEvent.meetingDateTime)}
                </Text>
              </View>
            </View>
          </View>

          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#F0F9FF',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="location" size={20} color="#4A90E2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>위치</Text>
                <Text style={{ fontSize: 15, color: '#1a1a1a', fontWeight: '600' }}>
                  {selectedEvent.location}
                </Text>
              </View>
            </View>
          </View>

          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 14, color: '#999', marginBottom: 12, fontWeight: '600' }}>정원</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{
    flex: 1,
                backgroundColor: '#F0F9FF',
                padding: 14,
                borderRadius: 12,
                marginRight: 8,
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#4A90E2',
                    marginRight: 6,
                  }} />
                  <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>남자</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a' }}>
                  {selectedEvent.currentMaleParticipants}/{selectedEvent.maxMaleParticipants}
                </Text>
              </View>
              <View style={{
    flex: 1,
                backgroundColor: '#FFF0F5',
                padding: 14,
                borderRadius: 12,
                marginLeft: 8,
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#FF6B9D',
                    marginRight: 6,
                  }} />
                  <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>여자</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a' }}>
                  {selectedEvent.currentFemaleParticipants}/{selectedEvent.maxFemaleParticipants}
                </Text>
              </View>
            </View>
          </View>

          <View style={{
            backgroundColor: '#fff',
    borderRadius: 16,
            padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
    shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FEF3C7',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="person" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>호스트</Text>
                <Text style={{ fontSize: 15, color: '#1a1a1a', fontWeight: '600' }}>
                  {selectedEvent.hostNickname}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>참여자</Text>
            {participants.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#999' }}>참여자가 없습니다</Text>
            ) : (
              participants.map(p => (
                <View key={p.authUserId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>{p.gender === 'MALE' ? '남자' : '여자'}</Text>
                  <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>{p.status === 'ACTIVE' ? '참여 중' : '탈퇴'}</Text>
                </View>
              ))
            )}
          </View>

          {!isHost && !isParticipant && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={{
                backgroundColor: '#FF6B9D',
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                marginTop: 20,
                shadowColor: '#FF6B9D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
              onPress={() => setJoinModal({ visible: true, event: selectedEvent })}
            >
              <Text style={{
                color: '#fff',
                fontSize: 16,
    fontWeight: '700',
              }}>참여하기</Text>
            </TouchableOpacity>
          )}

          {isParticipant && myParticipant && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                marginTop: 20,
                borderWidth: 2,
                borderColor: '#FF5252',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => handleLeaveEvent(selectedEvent.meetingUuid, myParticipant.authUserId)}
            >
              <Text style={{
                color: '#FF5252',
                fontSize: 16,
                fontWeight: '700',
              }}>탈퇴하기</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  // 채팅방 목록 화면
  const ChatListScreen = (): JSX.Element => {
    const [chatRooms, setChatRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchChatRooms = async () => {
      try {
        if (!userInfo) return;
        
        // 내가 참여한 이벤트 조회
        const response = await axios.get(`${QUERY_BASE_URL}/users/me/events`, {
          params: { page: 0, size: 100 },
          headers: {
            'X-User-Id': userInfo.id,
  },
        });
        const events = response.data.content || [];
        
        // 각 이벤트의 마지막 메시지 fetch 및 채팅방 ID 생성
        const roomsWithLastMsg = await Promise.all(
          events.map(async (event: any) => {
            const chatRoomId = Math.abs(event.meetingUuid.split('-').reduce((acc: number, val: string) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
            let lastMsg = null;
            try {
              const msgRes = await axios.get(`${CHAT_BASE_URL}/api/chat/rooms/${chatRoomId}/all`);
              const msgs = Array.isArray(msgRes.data) ? msgRes.data : [];
              lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            } catch (err) {
              console.error('메시지 가져오기 실패:', err);
            }
            return { 
              ...event, 
              chatRoomId,
              lastMsg,
              eventName: event.title,
              eventUuid: event.meetingUuid,
              eventHostId: event.hostAuthUserId,
            };
          })
        );
        
        // 최신 메시지 순 정렬
        roomsWithLastMsg.sort((a, b) => {
          const aTime = a.lastMsg?.sentAt ? new Date(a.lastMsg.sentAt).getTime() : 0;
          const bTime = b.lastMsg?.sentAt ? new Date(b.lastMsg.sentAt).getTime() : 0;
          return bTime - aTime;
        });
        setChatRooms(roomsWithLastMsg);
      } catch (error) {
        console.error('채팅방 목록 가져오기 실패:', error);
        setChatRooms([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    useEffect(() => {
      if (userInfo && activeScreen === 'chat-list') {
        setLoading(true);
        fetchChatRooms();
      }
    }, [userInfo, activeScreen]);

    const onRefresh = () => {
      setRefreshing(true);
      fetchChatRooms();
    };

    // Swipeable의 오른쪽 액션 렌더러
    const renderRightActions = (room: any) => (
      <TouchableOpacity
        style={{ backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', width: 100, height: '100%' }}
        onPress={async () => {
          Alert.alert(
            '이벤트 나가기',
            '정말로 이 이벤트에서 나가시겠습니까?',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '확인',
                style: 'destructive',
                onPress: async () => {
                  try {
                    // 참여자 정보 가져오기
                    const participantsRes = await axios.get(`${QUERY_BASE_URL}/events/${room.meetingUuid}/participants`);
                    const participantsList = participantsRes.data.content || [];
                    const myParticipant = participantsList.find((p: any) => p.authUserId === userInfo?.id && p.status === 'ACTIVE');
                    
                    if (myParticipant) {
                      await axios.delete(`${COMMAND_BASE_URL}/events/${room.meetingUuid}/participants/${myParticipant.authUserId}`);
                      setChatRooms(prev => prev.filter(r => r.meetingUuid !== room.meetingUuid));
                      fetchEventList();
                    }
                  } catch (err) {
                    alert('이벤트 나가기 실패: ' + (err.response?.data?.message || err.message));
                  }
                }
              }
            ]
          );
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>나가기</Text>
      </TouchableOpacity>
    );

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* 헤더 */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
    paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <TouchableOpacity 
            onPress={() => setActiveScreen('dashboard')}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', flex: 1 }}>채팅</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 16 }}>로딩 중...</Text>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => String(item.meetingUuid || item.chatRoomId)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF6B9D']}
                tintColor="#FF6B9D"
              />
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 }}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" style={{ marginBottom: 16 }} />
                <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                  참여 중인 채팅방이 없습니다
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
                  이벤트에 참여하면 채팅방이 여기에 표시됩니다
                </Text>
              </View>
            }
            renderItem={({ item: room }) => (
              <Swipeable
                key={room.meetingUuid}
                renderRightActions={() => renderRightActions(room)}
                overshootRight={false}
              >
                <TouchableOpacity
                  style={{ 
                    flexDirection: 'row', 
    alignItems: 'center',
                    padding: 16, 
                    backgroundColor: '#fff',
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!room.chatRoomId) {
                      Alert.alert('채팅방 진입 불가', '이 이벤트에는 채팅방 ID가 없습니다.');
                      return;
                    }
                    setChatEntrySource('chat-list');
                    setActiveChat({ 
                      chatRoomId: room.chatRoomId, 
                      eventName: room.eventName || room.title, 
                      eventUuid: room.eventUuid || room.meetingUuid,
                      eventHostId: room.eventHostId || room.hostAuthUserId,
                    });
                    setActiveScreen('chat');
                  }}
                >
                  {/* 이미지 */}
                  <View style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 12, 
                    marginRight: 14, 
                    backgroundColor: '#FF6B9D', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Text style={{ fontSize: 28 }}>💕</Text>
                  </View>
                  
                  {/* 내용 */}
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 }} numberOfLines={1}>
                        {room.eventName || room.title}
                      </Text>
                      {(() => {
                        // 호스트 여부 확인
                        const hostId = String(room.eventHostId || room.hostAuthUserId || '');
                        const userId = String(userInfo?.id || '');
                        return hostId && userId && hostId === userId;
                      })() && (
                        <View style={{ 
                          backgroundColor: '#FEF3C7', 
                          paddingHorizontal: 6, 
                          paddingVertical: 2, 
                          borderRadius: 4, 
                          marginLeft: 6 
                        }}>
                          <Text style={{ fontSize: 9, color: '#92400E', fontWeight: '600' }}>호스트</Text>
                        </View>
                      )}
                    </View>
                    <Text 
                      style={{ 
    fontSize: 14,
                        color: '#6B7280', 
                        marginTop: 2 
                      }} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      {room.lastMsg?.content ? room.lastMsg.content : '메시지가 없습니다'}
                    </Text>
                  </View>
                  
                  {/* 시간 */}
                  <View style={{ alignItems: 'flex-end' }}>
                    {room.lastMsg?.sentAt ? (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                        {getTimeAgo(room.lastMsg.sentAt)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Swipeable>
            )}
          />
        )}
      </SafeAreaView>
    );
  };

  // 내 이벤트 화면
  const MyEventsScreen = (): JSX.Element => {
    useEffect(() => {
      if (activeTab === 'my-events') {
        fetchMyEvents();
      }
    }, [activeTab, userInfo]);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <TouchableOpacity
            onPress={() => setActiveTab('dashboard')}
            style={{ padding: 5, marginRight: 10 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '600', flex: 1 }}>내 이벤트</Text>
        </View>

        <ScrollView
          style={{ flex: 1, padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchMyEvents} />
          }
        >
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#999', fontSize: 14 }}>로딩 중...</Text>
            </View>
          ) : eventList.length > 0 ? (
            eventList.map(event => {
              // 참여 여부 확인
              const isHost = userInfo && event.hostAuthUserId === userInfo.id;
              const isParticipant = true; // 내 이벤트 화면이므로 이미 참여한 상태
              
              return (
              <TouchableOpacity
                key={event.meetingUuid}
                style={[styles.studyListItem, { marginBottom: 12 }]}
                onPress={() => {
                  // 이미 참여한 경우 채팅방으로 이동
                  const chatRoomId = Math.abs(event.meetingUuid.split('-').reduce((acc, val) => acc + parseInt(val.replace(/\D/g, ''), 16), 0)) % 1000000;
                  setActiveScreen('chat');
                  setActiveChat({
                    chatRoomId: chatRoomId,
                    eventName: event.title,
                    eventUuid: event.meetingUuid,
                    eventHostId: event.hostAuthUserId,
                  });
                  setChatEntrySource('event');
                }}
              >
                <View style={styles.studyItemContent}>
                  <Text style={styles.studyTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.studyDescription} numberOfLines={2}>
                    {event.description}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>{event.location}</Text>
                    <Text style={{ fontSize: 12, color: '#666', marginLeft: 12 }}>{formatDateTime(event.meetingDateTime)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>참여 중인 이벤트가 없습니다</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  // 채팅방 화면
  const ChatRoomScreen = ({ chatRoomId, eventName, onBack, userInfo }): JSX.Element => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [initialMessageIds, setInitialMessageIds] = useState(new Set());
    const scrollViewRef = useRef(null);
    const pollingRef = useRef(false);

    // 메시지 불러오기
    const fetchMessages = async (isPolling = false) => {
      if (isPolling) pollingRef.current = true;
      if (!isPolling) setLoading(true);
      try {
        const res = await axios.get(`${CHAT_BASE_URL}/api/chat/rooms/${chatRoomId}/all`);
        const allMessages = Array.isArray(res.data) ? res.data : [];
        
        if (isPolling) {
          const newMessages = allMessages.filter(msg => !initialMessageIds.has(msg.id));
          setMessages(prevMessages => {
            const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
            const uniqueNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg.id));
            return [...prevMessages, ...uniqueNewMessages];
          });
        } else {
          setMessages([]);
          const initialIds = new Set(allMessages.map(msg => msg.id));
          setInitialMessageIds(initialIds);
        }
      } catch (err) {
        console.error('fetchMessages 에러:', err);
        setMessages([]);
        setInitialMessageIds(new Set());
      }
      if (!isPolling) setLoading(false);
      if (isPolling) pollingRef.current = false;
    };

    useEffect(() => {
      setMessages([]);
      setInitialMessageIds(new Set());
      fetchMessages(false);
      const interval = setInterval(() => fetchMessages(true), 1000);
      return () => clearInterval(interval);
    }, [chatRoomId]);

    // 메시지 전송
    const handleSend = async () => {
      if (!input.trim() || !userInfo) return;
      if (!chatRoomId) {
        alert('채팅방 ID가 없습니다.');
        return;
      }
      setSending(true);
      const newMsg = {
        id: Date.now(),
        userId: userInfo.id,
        sender: userInfo.name,
        content: input.trim(),
        sentAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      try {
        await axios.post(`${CHAT_BASE_URL}/api/chat/send`, {
          chatRoomId: chatRoomId,
          userId: null,
          userEmail: userInfo.email,
          sender: userInfo.name,
          content: newMsg.content,
        });
        setTimeout(async () => {
          await fetchMessages(true);
        }, 500);
      } catch (err) {
        console.error('메시지 전송 실패:', err);
      }
      setSending(false);
    };

    useEffect(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, [messages]);

    const sortedMessages = useMemo(() => {
      return (Array.isArray(messages) ? messages : []).slice().sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    }, [messages]);

    const formatTime = (date) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      let h = d.getHours();
      const m = d.getMinutes();
      const isAM = h < 12;
      const ampm = isAM ? '오전' : '오후';
      h = h % 12;
      if (h === 0) h = 12;
      return `${ampm} ${h}:${m.toString().padStart(2, '0')}`;
    };

    const avatarColors = ['#6EC6FF', '#FFD54F', '#A5D6A7', '#FF8A65', '#BA68C8', '#4DD0E1', '#F06292', '#90A4AE', '#FFF176', '#81C784'];
    const getAvatarColor = (userId) => {
      let hash = 0;
      const str = String(userId);
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <TouchableOpacity
              onPress={onBack}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, marginRight: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={28} color="#222" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{eventName}</Text>
            </View>
          </View>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 12 }}
            ref={scrollViewRef}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          >
            {sortedMessages.map((msg, idx) => {
              const isMe = userInfo && String(msg.userId) === String(userInfo.id);
              const isSystemMessage = msg.sender === '시스템';
              
              if (isSystemMessage) {
                return (
                  <React.Fragment key={msg.id || msg._id || (msg.sentAt + '_' + (msg.userId || '') + '_' + idx)}>
                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                      <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, maxWidth: '80%' }}>
                        <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', fontWeight: '400' }}>
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              }
              
              let showTime = true;
              if (idx < sortedMessages.length - 1) {
                const nextMsg = sortedMessages[idx + 1];
                if (
                  nextMsg &&
                  String(nextMsg.userId) === String(msg.userId) &&
                  Math.abs(new Date(nextMsg.sentAt) - new Date(msg.sentAt)) < 60000
                ) {
                  showTime = false;
                }
              }
              
              return (
                <React.Fragment key={msg.id || msg._id || (msg.sentAt + '_' + (msg.userId || '') + '_' + idx)}>
                  <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8, alignItems: 'center' }}>
                    {!isMe && (() => {
                      const isFirstOfGroup = idx === 0 || String(sortedMessages[idx - 1].userId) !== String(msg.userId) || Math.abs(new Date(msg.sentAt) - new Date(sortedMessages[idx - 1].sentAt)) > 60000;
                      return (
                        <>
                          {isFirstOfGroup ? (
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: getAvatarColor(msg.userId), alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                              <Ionicons name="person" size={20} color="#fff" />
                            </View>
                          ) : (
                            <View style={{ width: 32, height: 32, marginRight: 8 }} />
                          )}
                          <View style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
                            {isFirstOfGroup && msg.sender && (
                              <Text style={{ fontSize: 12, color: '#444', fontWeight: '500', marginLeft: 6, marginBottom: 2 }}>
                                {msg.sender}
                              </Text>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                              <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 12, maxWidth: 220, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, alignSelf: 'flex-start' }}>
                                <Text style={{ color: '#333', fontSize: 15 }}>{msg.content}</Text>
                              </View>
                              {showTime && <Text style={{ fontSize: 11, color: '#888', marginLeft: 4, marginBottom: 2 }}>
                                {msg.sentAt ? formatTime(msg.sentAt) : ''}
                              </Text>}
                            </View>
                          </View>
                        </>
                      );
                    })()}
                    {isMe && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                          {showTime && <Text style={{ fontSize: 11, color: '#888', marginRight: 4, marginBottom: 2 }}>
                            {msg.sentAt ? formatTime(msg.sentAt) : ''}
                          </Text>}
                          <View style={{ backgroundColor: '#FF6B9D', borderRadius: 18, padding: 12, maxWidth: 220, borderWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, alignSelf: 'flex-end' }}>
                            <Text style={{ color: '#fff', fontSize: 15 }}>{msg.content}</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 12, height: 48 }}>
              <TextInput
                style={{ flex: 1, fontSize: 17, height: 32, textAlignVertical: 'center', paddingVertical: 0, marginTop: 10 }}
                value={input}
                onChangeText={setInput}
                placeholder="메시지를 입력하세요"
                placeholderTextColor="#bbb"
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()} style={{ marginLeft: 8, padding: 8 }}>
              <Text style={{ fontSize: 34, color: sending || !input.trim() ? '#aaa' : '#FF6B9D' }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // 화면 렌더링
  const renderScreen = (): JSX.Element => {
    if (activeScreen === 'chat') {
      return <ChatRoomScreen 
        chatRoomId={activeChat.chatRoomId} 
        eventName={activeChat.eventName} 
        onBack={() => {
          if (chatEntrySource === 'event') {
            setActiveScreen('dashboard');
          } else {
            setActiveScreen('chat-list');
          }
        }} 
        userInfo={userInfo} 
      />;
    }
    
    if (activeScreen === 'chat-list') {
      return <ChatListScreen />;
    }
    
    if (showEventDetail) {
      return <EventDetailScreen />;
    }

    switch (activeTab) {
      case 'my-events':
        return <MyEventsScreen />;
      case 'dashboard':
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: screenFadeAnim,
              transform: [{ translateY: screenSlideAnim }],
            },
          ]}
        >
          {renderScreen()}
        </Animated.View>

        {/* 검색 모달 */}
        <Modal
          transparent={true}
          visible={showSearchModal}
          onRequestClose={() => setShowSearchModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowSearchModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.centerModalContent, styles.searchModalContent]}>
                  <View style={styles.searchContainer}>
                    <Text style={styles.searchLabel}>검색</Text>
                    <View style={styles.searchInputContainer}>
                      <TextInput
                        style={styles.searchInput}
                        placeholder="키워드 또는 위치를 입력하세요"
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                      />
                      <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearch}
                      >
                        <Text style={styles.searchButtonText}>검색</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 이벤트 생성 모달 */}
        <Modal
          transparent={true}
          visible={showCreateModal && !showCityPicker && !showDistrictPicker}
          onRequestClose={() => setShowCreateModal(false)}
          animationType="fade"
        >
          <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
    alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 20,
              paddingBottom: 10,
            }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                  style={{ width: '100%', maxWidth: 500 }}
                >
                  <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 24,
                    paddingTop: 24,
                    paddingBottom: 24,
                    maxHeight: '98%',
                    width: '100%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                    elevation: 10,
                  }}>
                    {/* 헤더 */}
                    <View style={{
    flexDirection: 'row',
                      alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
                      paddingBottom: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f0f0f0',
                      marginBottom: 20,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#FFF0F5',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 10,
                        }}>
                          <Ionicons name="heart" size={18} color="#FF6B9D" />
                        </View>
                        <Text style={{
    fontSize: 20,
                          fontWeight: '800',
                          color: '#1a1a1a',
                        }}>
                          소개팅 모임 생성
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowCreateModal(false)}
                        style={{
                          width: 32,
                          height: 32,
    borderRadius: 16,
                          backgroundColor: '#f5f5f5',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      style={{ maxHeight: 1200 }}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* 제목 */}
                      <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="text-outline" size={16} color="#FF6B9D" style={{ marginRight: 6 }} />
                          <Text style={{
                            fontSize: 14,
    fontWeight: '700',
                            color: '#1a1a1a',
                          }}>
                            제목
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            borderWidth: 2,
                            borderColor: '#f0f0f0',
                            borderRadius: 12,
                            padding: 14,
                            fontSize: 15,
                            backgroundColor: '#fafafa',
                            color: '#1a1a1a',
                          }}
                          placeholder="모임 제목을 입력하세요"
                          placeholderTextColor="#999"
                          value={eventForm.title}
                          onChangeText={text => setEventForm({ ...eventForm, title: text })}
                        />
                      </View>

                      {/* 설명 */}
                      <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="document-text-outline" size={16} color="#FF6B9D" style={{ marginRight: 6 }} />
                          <Text style={{
    fontSize: 14,
                            fontWeight: '700',
                            color: '#1a1a1a',
                          }}>
                            설명
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            borderWidth: 2,
                            borderColor: '#f0f0f0',
                            borderRadius: 12,
                            padding: 14,
                            fontSize: 15,
                            backgroundColor: '#fafafa',
                            color: '#1a1a1a',
                            minHeight: 80,
                            textAlignVertical: 'top',
                          }}
                          placeholder="모이는 목적을 입력하세요"
                          placeholderTextColor="#999"
                          value={eventForm.description}
                          onChangeText={text => setEventForm({ ...eventForm, description: text })}
                          multiline
                        />
                      </View>

                      {/* 위치 */}
                      <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="location-outline" size={16} color="#FF6B9D" style={{ marginRight: 6 }} />
                          <Text style={{
    fontSize: 14,
                            fontWeight: '700',
                            color: '#1a1a1a',
                          }}>
                            위치
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              console.log('시/도 선택 버튼 클릭됨');
                              setShowCityPicker(true);
                            }}
                            style={{
                              flex: 1,
                              borderWidth: 2,
                              borderColor: selectedCity ? '#FF6B9D' : '#f0f0f0',
                              borderRadius: 12,
                              paddingVertical: 14,
                              paddingHorizontal: 14,
                              backgroundColor: '#fff',
                              marginRight: 8,
                            }}
                          >
                            <Text style={{ color: selectedCity ? '#1a1a1a' : '#999', fontSize: 15 }}>
                              {selectedCity || '시/도 선택'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              if (selectedCity) {
                                console.log('구/군 선택 버튼 클릭됨');
                                setShowDistrictPicker(true);
                              }
                            }}
                            disabled={!selectedCity}
                            style={{
                              flex: 1,
                              borderWidth: 2,
                              borderColor: selectedDistrict ? '#FF6B9D' : '#f0f0f0',
                              borderRadius: 12,
                              paddingVertical: 14,
                              paddingHorizontal: 14,
                              backgroundColor: selectedCity ? '#fff' : '#fafafa',
                            }}
                          >
                            <Text style={{ color: selectedDistrict ? '#1a1a1a' : '#999', fontSize: 15 }}>
                              {selectedDistrict || '구/군 선택'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {eventForm.location && (
                          <Text style={{ fontSize: 12, color: '#FF6B9D', marginTop: 4 }}>
                            ✓ 선택된 지역: {eventForm.location}
                          </Text>
                        )}
                      </View>

                      {/* 정원 */}
                      <View style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="people-outline" size={16} color="#FF6B9D" style={{ marginRight: 6 }} />
                          <Text style={{
    fontSize: 14,
                            fontWeight: '700',
                            color: '#1a1a1a',
                          }}>
                            정원
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {/* 남성 정원 */}
                          <View style={{ flex: 1 }}>
                            <View style={{
    flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 6,
                            }}>
                              <View style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: '#4A90E2',
                                marginRight: 6,
                              }} />
                              <Text style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: '#666',
                              }}>
                                남성
                              </Text>
                            </View>
                            <TextInput
                              style={{
                                borderWidth: 2,
                                borderColor: '#f0f0f0',
                                borderRadius: 12,
                                padding: 14,
                                fontSize: 15,
                                backgroundColor: '#F0F9FF',
                                color: '#1a1a1a',
                                textAlign: 'center',
                                fontWeight: '700',
                              }}
                              placeholder="10"
                              placeholderTextColor="#999"
                              value={eventForm.maxMaleParticipants}
                              onChangeText={text => setEventForm({ ...eventForm, maxMaleParticipants: text })}
                              keyboardType="numeric"
                            />
                          </View>

                          {/* 여성 정원 */}
                          <View style={{ flex: 1 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 6,
                            }}>
                              <View style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: '#FF6B9D',
                                marginRight: 6,
                              }} />
                              <Text style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: '#666',
                              }}>
                                여성
                              </Text>
                            </View>
                            <TextInput
                              style={{
                                borderWidth: 2,
                                borderColor: '#f0f0f0',
                                borderRadius: 12,
                                padding: 14,
                                fontSize: 15,
                                backgroundColor: '#FFF0F5',
                                color: '#1a1a1a',
                                textAlign: 'center',
                                fontWeight: '700',
                              }}
                              placeholder="10"
                              placeholderTextColor="#999"
                              value={eventForm.maxFemaleParticipants}
                              onChangeText={text => setEventForm({ ...eventForm, maxFemaleParticipants: text })}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      </View>
                    </ScrollView>

                    {/* 하단 버튼 */}
                    <View style={{
                      paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
                      borderTopColor: '#f0f0f0',
                    }}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={{
                          backgroundColor: '#FF6B9D',
                          borderRadius: 14,
                          paddingVertical: 16,
                          alignItems: 'center',
                          shadowColor: '#FF6B9D',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 5,
                        }}
                        onPress={handleCreateEvent}
                      >
                        <Text style={{
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: '700',
                        }}>
                          소개팅 모임 생성하기 💕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 날짜 선택 모달 */}
        <Modal
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
          animationType="slide"
        >
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }]}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={{
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  maxHeight: '60%',
                  width: '100%',
                }}>
                  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="calendar" size={24} color="#FF6B9D" style={{ marginRight: 12 }} />
                      <Text style={{
                        fontSize: 20,
                        fontWeight: '700',
                        color: '#1a1a1a',
                      }}>
                        날짜 및 시간 선택
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#f5f5f5',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={{
                    backgroundColor: '#fafafa',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      color: '#999',
                      marginBottom: 8,
                    }}>
                      형식: YYYY-MM-DDTHH:mm
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#999',
                    }}>
                      예시: 2025-11-15T14:00
                    </Text>
                  </View>

                  <TextInput
                    style={{
                      borderWidth: 2,
                      borderColor: '#FF6B9D',
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      backgroundColor: '#FFF0F5',
                      color: '#1a1a1a',
                      marginBottom: 20,
    fontWeight: '600',
                    }}
                    placeholder="2025-11-15T14:00"
                    placeholderTextColor="#999"
                    value={eventForm.meetingDateTime}
                    onChangeText={text => setEventForm({ ...eventForm, meetingDateTime: text })}
                  />

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={{
                      backgroundColor: '#FF6B9D',
                      borderRadius: 12,
                      paddingVertical: 16,
                      alignItems: 'center',
                      shadowColor: '#FF6B9D',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '700',
                    }}>
                      확인
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 시/도 선택 모달 */}
        <Modal
          visible={showCityPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCityPicker(false)}
          statusBarTranslucent={true}
          presentationStyle="overFullScreen"
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ 
              backgroundColor: '#fff', 
              borderTopLeftRadius: 20, 
              borderTopRightRadius: 20, 
              padding: 20, 
              maxHeight: '60%',
              width: '100%',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>시/도 선택</Text>
                <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>완료</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {REGIONS && Object.keys(REGIONS).length > 0 ? (
                  Object.keys(REGIONS).map((city) => (
                    <TouchableOpacity
                      key={city}
                      onPress={() => {
                        console.log('시/도 선택됨:', city);
                        setSelectedCity(city);
                        setSelectedDistrict('');
                        setEventForm({ ...eventForm, location: '' });
                        setShowCityPicker(false);
                      }}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E5E7EB',
                      }}
                    >
                      <Text style={{ fontSize: 16, color: selectedCity === city ? '#111827' : '#374151' }}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                    지역 정보를 불러올 수 없습니다.
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 구/군 선택 모달 */}
        <Modal
          visible={showDistrictPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDistrictPicker(false)}
          statusBarTranslucent={true}
          presentationStyle="overFullScreen"
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ 
              backgroundColor: '#fff', 
              borderTopLeftRadius: 20, 
              borderTopRightRadius: 20, 
              padding: 20, 
              maxHeight: '60%',
              width: '100%',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>구/군 선택</Text>
                <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>완료</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {selectedCity && REGIONS[selectedCity]?.map((district) => (
                  <TouchableOpacity
                    key={district}
                    onPress={() => {
                      setSelectedDistrict(district);
                      setEventForm({ ...eventForm, location: `${selectedCity} ${district}` });
                      setShowDistrictPicker(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                    }}
                  >
                    <Text style={{ fontSize: 16, color: selectedDistrict === district ? '#111827' : '#374151' }}>
                      {district}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 참여 모달 */}
        <Modal
          transparent
          visible={joinModal.visible}
          animationType="fade"
          onRequestClose={() => setJoinModal({ visible: false, event: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.centerModalContent, { width: '85%', maxWidth: 350, padding: 24 }]}> 
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>이벤트에 참여하시겠습니까?</Text>
              <View style={{ width: 60, height: 60, borderRadius: 12, alignSelf: 'center', marginBottom: 12, backgroundColor: '#FF6B9D', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 30 }}>💕</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 6 }} numberOfLines={1} ellipsizeMode="tail">
                {joinModal.event?.title ?? ''}
              </Text>
              {joinModal.event?.description ? (
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' }} numberOfLines={2} ellipsizeMode="tail">
                  {joinModal.event.description}
                </Text>
              ) : null}
              <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 14 }}>
                위치: {joinModal.event?.location ?? '-'}  |  호스트: {joinModal.event?.hostNickname ?? '-'}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.createSubmitButton, { backgroundColor: '#ccc', flex: 1, marginHorizontal: 4 }]}
                  onPress={() => setJoinModal({ visible: false, event: null })}
                  disabled={joinLoading}
                >
                  <Text style={styles.createSubmitButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createSubmitButton, { flex: 1, marginHorizontal: 4, backgroundColor: joinLoading ? '#ccc' : '#FF6B9D' }]}
                  onPress={handleJoinEvent}
                  disabled={joinLoading}
                >
                  <Text style={[styles.createSubmitButtonText, { color: '#fff' }]}>{joinLoading ? '참여 중...' : '참여'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default DatingApp;
