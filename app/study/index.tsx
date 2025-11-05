import React, { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  RefreshControl,
  Alert,
  FlatList,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/styles/hljs';
import * as SecureStore from 'expo-secure-store';
import { useApiBaseUrl } from './hooks/useApiBaseUrl';
import { getCategoryLabel } from './utils/getCategoryLabel';
import { getTimeAgo } from './utils/getTimeAgo';
import { REGIONS } from './utils/regions';
import { ActiveScreen, ActiveChat, ParticipantCounts, Category, StudyRoom, Meeting } from './types';
import { styles } from './styles';
import { AttendanceGrass } from './components/AttendanceGrass';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { ScheduleModal } from './components/ScheduleModal';
import { SearchModal } from './components/SearchModal';

// auth-service base URL은 동적으로 설정됩니다

const StudyApp = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(20)).current;
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [participantCounts, setParticipantCounts] = useState<ParticipantCounts>({});
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('list');
  const [activeChat, setActiveChat] = useState<ActiveChat>({ chatRoomId: null, studyName: '', studyRoomId: null, studyRoomHostId: null });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [studyList, setStudyList] = useState<StudyRoom[]>([]);
  const [filteredStudyData, setFilteredStudyData] = useState<StudyRoom[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [meetingList, setMeetingList] = useState<Meeting[]>([]); // 실제 DB 일정 리스트
  const [recommendedStudies, setRecommendedStudies] = useState<StudyRoom[]>([]);

  // 카테고리 선택 모달에서 사용하는 폼 상태
  type StudyForm = {
    name: string;
    category: string | number;
    peopleCount: string;
    imageUrl: string;
    description: string;
    password?: string;
    hashtags?: string; // 쉼표로 구분된 해시태그 문자열
    region?: string; // 지역 (예: "서울특별시 강남구")
  };
  const studyFormRef = useRef<StudyForm>({
    name: '',
    category: '',
    peopleCount: '',
    imageUrl: '',
    description: '',
    hashtags: '',
    region: '',
  });

  // 검색 관련 상태
  const searchRef = useRef<{ type: string; text: string }>({
    type: 'title',
    text: ''
  });

  const BASE_URL = useApiBaseUrl('172.16.113.138', 8080);
  const AUTH_BASE_URL = useApiBaseUrl('172.16.113.138', 8082);
  const fetchStudyList = async (): Promise<void> => {
    try {
      console.log('스터디 목록 가져오기 시작: API 호출');
      
      // 실제 API 호출
      const response = await axios.get(`${BASE_URL}/api/study`);
      console.log('스터디 목록 API 응답:', response.data);
      
      // API 응답 데이터를 StudyRoom 형식으로 변환
      const studyRooms = response.data.map((room: any) => ({
        id: room.id,
        name: room.name,
        imageUrl: room.imageUrl || '',
        chatId: room.chatId,
        studyRoomHostId: room.studyRoomHostId,
        categoriesId: room.categoriesId,
        participants: [], // 나중에 필요하면 추가로 fetch
        description: room.description || '',
        hashtags: room.hashtags || '',
        region: room.region || '',
        password: room.password || '',
        peopleCount: room.peopleCount || 0,
        hostName: room.hostName || '호스트',
        created_at: room.created_at || new Date().toISOString(),
        lastMsg: null,
      }));
      
      console.log('스터디 목록 설정 완료:', studyRooms.length);
      setStudyList(studyRooms);
      setFilteredStudyData(studyRooms);
      
      // 참여자 수 가져오기
      await fetchAllParticipantCounts(studyRooms);
      
      // 일정 가져오기
      await fetchAllMeetings(studyRooms);
    } catch (err) {
      console.error('스터디 목록 가져오기 실패:', err);
      setStudyList([]);
      setFilteredStudyData([]);
      setParticipantCounts({});
      setMeetingList([]);
    }
  };
  const fetchCategoryList = async () => {
    try {
      console.log('카테고리 목록 가져오기: API 호출');
      
      // 실제 API 호출
      const response = await axios.get(`${BASE_URL}/api/study/category`);
      console.log('카테고리 목록 API 응답:', response.data);
      
      // API 응답 데이터를 Category 형식으로 변환
      const categories = response.data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
      }));
      
      console.log('카테고리 목록 설정 완료:', categories.length);
      setCategoryList(categories);
    } catch (err) {
      console.error('카테고리 목록 가져오기 실패:', err);
      setCategoryList([]);
    }
  };

  // 스터디방 참여자 수를 모두 fetch
  const fetchAllParticipantCounts = async (studyRooms: StudyRoom[]): Promise<void> => {
    const counts: ParticipantCounts = {};
    await Promise.all(
      studyRooms.map(async (room) => {
        try {
          const res = await axios.get(`${BASE_URL}/api/study/${room.id}/users`);
          counts[room.id] = Array.isArray(res.data) ? res.data.length : 0;
        } catch {
          counts[room.id] = 0;
        }
      })
    );
    setParticipantCounts(counts);
  };

  // 추천 모임 fetch 함수
  const fetchRecommendedStudies = async (): Promise<void> => {
    try {
      console.log('추천 모임 가져오기 시작');
      const response = await axios.get(`${BASE_URL}/api/study/recommended`);
      console.log('추천 모임 응답:', response.data);
      
      // API 응답 데이터를 StudyRoom 형식으로 변환
      const recommended = response.data.map((room: any) => ({
        id: room.id,
        name: room.name,
        imageUrl: room.imageUrl || '',
        chatId: room.chatId,
        studyRoomHostId: room.studyRoomHostId,
        categoriesId: room.categoriesId,
        hostName: room.hostName || '호스트',
        participants: [], // 나중에 필요하면 추가로 fetch
        description: room.description || '',
        hashtags: room.hashtags || '',
        region: room.region || '',
        peopleCount: room.peopleCount || 0,
      }));
      
      setRecommendedStudies(recommended);
      console.log('추천 모임 설정 완료:', recommended.length);
    } catch (err) {
      console.error('추천 모임 가져오기 실패:', err);
      setRecommendedStudies([]);
    }
  };

  // 일정 fetch 함수
  const fetchAllMeetings = async (studyRooms: StudyRoom[]): Promise<void> => {
    // studyRooms: 참여중인 방 목록
    const meetings = [];
    await Promise.all(
      (studyRooms || []).map(async (room) => {
        try {
          const res = await axios.get(`${BASE_URL}/api/study/rooms/${room.id}/meeting`);
          if (res.data && res.data.id) {
            meetings.push({ ...res.data, studyRoomName: room.name });
          }
        } catch {}
      })
    );
    setMeetingList(meetings);
  };

  // 3. 앱 시작 시 목록/카테고리 fetch
  useEffect(() => {
    fetchStudyList();
    fetchCategoryList();
    fetchRecommendedStudies();
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

  // auth-service에서 토큰으로 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserFromAuth = async (): Promise<void> => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) {
          return; // 토큰이 없으면 로그인 화면 표시
        }

        // JWT 토큰에서 userId 추출
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
          
          if (userId) {
            // auth-service에서 사용자 정보 조회
            const userRes = await axios.get(`${AUTH_BASE_URL}/auth/users/${encodeURIComponent(userId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            // study-service 형식에 맞게 변환
            const authUser = userRes.data;
            setUserInfo({
              id: authUser.userId,
              name: authUser.name,
              email: authUser.email,
            });
          }
        } catch (e) {
          console.log('Token decode error:', e);
        }
      } catch (e) {
        console.log('Fetch user from auth error:', e);
      }
    };
    
    fetchUserFromAuth();
  }, []);

  useEffect(() => {
    if (showScheduleModal) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showScheduleModal]);



  const DashboardScreen = () => {
    const today = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const dayOfWeek = days[today.getDay()];
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [jobPostings, setJobPostings] = useState<any[]>([]);

    // 공고 목록 가져오기 (더미 데이터)
    useEffect(() => {
      // TODO: 실제 API 연동 시 여기서 공고 데이터를 가져옵니다
      const dummyJobPostings = [
        {
          id: 1,
          imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500',
          title: 'WIFI SW 개발자 채용',
          companyName: '(주)블루버드',
        },
        {
          id: 2,
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500',
          title: '파이썬 초/중급자 개발자 채용',
          companyName: '(주)씨텍',
        },
        {
          id: 3,
          imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500',
          title: '풀스택 개발자 모집',
          companyName: '소프트웨어기업',
        },
      ];
      setJobPostings(dummyJobPostings);
    }, []);



    // 카테고리 목록 (categoryList 사용)
    const categories = categoryList.length > 0 ? categoryList : [
      { id: 1, name: '언어/어학' },
      { id: 2, name: '취업/이직' },
      { id: 3, name: '공무원/임용' },
      { id: 4, name: '코딩' },
      { id: 5, name: '전문직' },
    ];

    // 카테고리 필터링된 스터디 목록 (all일 때는 전체 표시)
    const filteredStudies = selectedCategory === 'all'
      ? studyList
      : studyList.filter(study => String(study.categoriesId) === selectedCategory);

    // 추천 모임은 선택된 카테고리에 맞춰 필터링 (all일 때는 전체 표시)
    const filteredRecommendedStudies = selectedCategory === 'all' 
      ? recommendedStudies
      : recommendedStudies.filter(study => 
          String(study.categoriesId) === String(selectedCategory)
        );
    console.log('추천 모임 데이터:', filteredRecommendedStudies.length, '(카테고리:', selectedCategory, ')');

    return (
      <View style={styles.dashboardContainer}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* 메인 타이틀 */}
          <View style={styles.mainTitleContainer}>
            <Text style={styles.mainTitle}>
              스터디 공간
            </Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                onPress={() => {
                  setActiveScreen('chat-list');
                }}
                style={[styles.iconButton, { marginRight: 12 }]}
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setActiveScreen('notification');
                }}
                style={[styles.iconButton, { marginRight: 12 }]}
              >
                <Ionicons name="notifications-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setActiveScreen('profile');
                }}
                style={styles.iconButton}
              >
                <Ionicons name="person-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 카테고리 필터 */}
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {/* 전체 버튼 */}
              <TouchableOpacity
                onPress={() => setSelectedCategory('all')}
                style={[
                  styles.categoryButton,
                  selectedCategory === 'all' && styles.categoryButtonActive
                ]}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === 'all' && styles.categoryButtonTextActive
                  ]}
                >
                  전체
                </Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(String(cat.id))}
                  style={[
                    styles.categoryButton,
                    String(selectedCategory) === String(cat.id) && styles.categoryButtonActive
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      String(selectedCategory) === String(cat.id) && styles.categoryButtonTextActive
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 추천 모임 */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천 모임</Text>
              <TouchableOpacity onPress={() => setActiveTab('study-list')}>
                <Text style={styles.seeAllText}>모두보기 &gt;</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
              {filteredRecommendedStudies.length > 0 ? (
                filteredRecommendedStudies.map(study => (
                  <TouchableOpacity
                    key={study.id}
                    style={styles.recommendedCard}
                    onPress={() => {
                      const isHost = userInfo && study?.studyRoomHostId === userInfo.id;
                      const isParticipant = Array.isArray(study?.participants)
                        ? study.participants.some(p => p.userId === userInfo?.id)
                        : false;
                      if (isHost || isParticipant) {
                        setChatEntrySource('study');
                        setActiveChat({
                          chatRoomId: study.chatId,
                          studyName: study.name,
                          studyRoomId: study.id,
                          studyRoomHostId: study.studyRoomHostId,
                        });
                        setActiveScreen('chat');
                      } else {
                        alert('참여 후 입장 가능합니다.');
                      }
                    }}
                  >
                    {study.imageUrl ? (
                      <Image 
                        source={{ uri: study.imageUrl }} 
                        style={styles.recommendedImage} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.recommendedImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 40, color: '#ccc' }}>📚</Text>
                      </View>
                    )}
                    {/* 위치 표시 */}
                    {study?.region && (
                      <View style={styles.locationBadge}>
                        <Text style={styles.locationText}>{study.region}</Text>
                      </View>
                    )}
                    <Text style={styles.recommendedTitle} numberOfLines={1}>
                      {study?.name ? String(study.name) : '제목 없음'}
                    </Text>
                    {/* 해시태그 */}
                    {study?.hashtags && study.hashtags.trim() ? (
                      <View style={styles.hashtagContainer}>
                        {study.hashtags.split(',').filter(tag => tag.trim()).slice(0, 3).map((tag, index) => (
                          <Text key={index} style={styles.hashtag}>#{tag.trim()}</Text>
                        ))}
                        {study.hashtags.split(',').filter(tag => tag.trim()).length > 3 && (
                          <Text style={styles.hashtag}>+{study.hashtags.split(',').filter(tag => tag.trim()).length - 3}</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.hashtagContainer}>
                        <Text style={styles.hashtag}>{getCategoryLabel(study.categoriesId, categoryList)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>추천 모임이 없습니다</Text>
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

          {/* 공고 */}
          <View style={styles.jobSectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>공고</Text>
              <TouchableOpacity onPress={() => setActiveTab('job-postings')}>
                <Text style={styles.seeAllText}>모두보기 &gt;</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jobScroll}>
              {jobPostings && jobPostings.length > 0 ? (
                jobPostings.map((job) => (
                  <TouchableOpacity
                    key={job?.id || Math.random()}
                    style={styles.jobCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedJob(job);
                      setActiveScreen('job-detail');
                    }}
                  >
                    {job?.imageUrl ? (
                      <Image 
                        source={{ uri: job.imageUrl }} 
                        style={styles.jobImage} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.jobImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 40, color: '#ccc' }}>💼</Text>
                      </View>
                    )}
                    <View style={styles.jobContent}>
                      <Text style={styles.jobTitle} numberOfLines={2}>{job?.title || '제목 없음'}</Text>
                      <Text style={styles.jobCompanyName} numberOfLines={1}>{job?.companyName || '회사명 없음'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>공고가 없습니다</Text>
                </View>
              )}
            </ScrollView>
          </View>


        </ScrollView>
      </View>
    );
  };

  const handleSearch = () => {
    const { text, type } = searchRef.current;
    
    if (!text.trim()) {
      setFilteredStudyData(studyList);
      setShowSearchModal(false);
      return;
    }

    const searchQuery = text.toLowerCase().trim();
    const filtered = (Array.isArray(studyList) ? studyList : []).filter(study => {
      if (type === 'title') {
        return study?.name && study.name.toLowerCase().includes(searchQuery);
      } else {
        return study?.admin && study.admin.toLowerCase().includes(searchQuery);
      }
    });

    setFilteredStudyData(filtered);
    setShowSearchModal(false);
  };




  // 채팅방 화면
  const ChatRoomScreen = ({ chatRoomId, studyName, imageUrl, onBack, userInfo }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [initialMessageIds, setInitialMessageIds] = useState(new Set()); // 초기 메시지 ID 저장
    const scrollViewRef = useRef(null);
    const inputRef = useRef(null);
    const pollingRef = useRef(false);
    // + 버튼 메뉴 상태 추가
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    // ChatRoomScreen 내부에 일정 생성 모달 상태 추가
    const [showMeetingModal, setShowMeetingModal] = useState(false);
    const [meetingForm, setMeetingForm] = useState({
      date: '', // yyyy-MM-dd-HH:mm
      title: '',
      duration: '',
      onlineType: 'online', // 'online' or 'offline'
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [dateValue, setDateValue] = useState(new Date());
    const [tempDate, setTempDate] = useState(null); // 날짜 선택 임시 저장
    // 일정 생성 함수 추가
    const handleCreateMeeting = async () => {
      if (!meetingForm.date || !meetingForm.title || !meetingForm.duration) {
        alert('모든 항목을 입력해주세요.');
        return;
      }
      try {
        await axios.post(`${BASE_URL}/api/study/meeting`, {
          studyRoomId: chatRoomId,
          title: meetingForm.title,
          duration: meetingForm.duration,
          meetingTime: meetingForm.date, // yyyy-MM-dd-HH:mm
          onlineType: meetingForm.onlineType,
        });
        setShowMeetingModal(false);
        setMeetingForm({ date: '', title: '', duration: '', onlineType: 'online' });
        alert('일정이 생성되었습니다!');
      } catch (err) {
        alert('일정 생성 실패: ' + (err.response?.data?.message || err.message));
      }
    };
    // 일정 정보 불러오기 (채팅방 진입 시)
    const [meeting, setMeeting] = useState(null);
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [voteResult, setVoteResult] = useState(null);
    const [votes, setVotes] = useState({}); // {userId: 'yes'|'no'}

    // 일정 정보 불러오기 (채팅방 진입 시)
    useEffect(() => {
      const fetchMeeting = async () => {
        try {
          const res = await axios.get(`${BASE_URL}/api/study/rooms/${chatRoomId}/meeting`);
          setMeeting(res.data);
        } catch (e) {
          setMeeting(null);
        }
      };
      fetchMeeting();
    }, [chatRoomId]);

    // 메시지 불러오기 (입장한 사용자에게는 기존 메시지 숨김)
    const fetchMessages = async (isPolling = false) => {
      if (isPolling) pollingRef.current = true;
      if (!isPolling) setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/chat/rooms/${chatRoomId}/all`);
        const allMessages = Array.isArray(res.data) ? res.data : [];
        
        if (isPolling) {
          // 폴링 시에는 초기 메시지 ID에 없는 새 메시지만 추가
          const newMessages = allMessages.filter(msg => !initialMessageIds.has(msg.id));
          
          setMessages(prevMessages => {
            const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
            const uniqueNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg.id));
            return [...prevMessages, ...uniqueNewMessages];
          });
        } else {
          // 최초 입장 시에는 빈 배열로 시작하고 초기 메시지 ID 저장
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

    // 채팅방 진입 시 빈 메시지로 시작, 이후 새 메시지만 폴링
    useEffect(() => {
      setMessages([]); // 입장 시 기존 메시지 숨김
      setInitialMessageIds(new Set()); // 초기 메시지 ID 초기화
      
      // 즉시 한 번 fetchMessages 호출하여 초기 메시지 ID 설정
      fetchMessages(false);
      
      const interval = setInterval(() => fetchMessages(true), 1000); // 1초마다 새 메시지만 폴링 (더 빠른 반응)
      return () => clearInterval(interval);
    }, [chatRoomId]);

    // 메시지 전송
    const handleSend = async () => {
      if (!input.trim() || !userInfo) return;
      if (!chatRoomId) {
        alert('채팅방 ID가 없습니다. 방 목록에서 다시 입장해 주세요.');
        return;
      }
      setSending(true);
      // 1. 로컬에 바로 추가 (optimistic update)
      const newMsg = {
        id: Date.now(), // 임시 ID
        userId: userInfo.id,
        sender: userInfo.name,
        content: input.trim(),
        sentAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      try {
        await axios.post(`${BASE_URL}/api/chat/send`, {
          chatRoomId: chatRoomId,
          userId: null, // Long ID가 아니므로 null
          userEmail: userInfo.email, // 이메일로 사용자 찾기
          sender: userInfo.name,
          content: newMsg.content,
        });
        // 2. Redis Pub/Sub을 통해 메시지가 DB에 저장될 시간을 두고 fetch
        setTimeout(async () => {
          await fetchMessages(true);
        }, 500); // 0.5초 후 새 메시지 가져오기
      } catch (err) {
        // 에러 처리 (필요시 로컬 메시지 롤백)
      }
      setSending(false);
    };

    // 메시지 변경 시 자동 스크롤 제거
    useEffect(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, [messages]);

    // messages를 한 번만 정렬 (useMemo 사용)
    const sortedMessages = React.useMemo(() => {
      return (Array.isArray(messages) ? messages : []).slice().sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    }, [messages]);

    // 채팅방 상단에 일정 공지 표시 (ScrollView 위로 이동, 항상 상단 고정)
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60} // 헤더 높이에 맞게 필요시 조정
      >
        <View style={{ flex: 1 }}>
          {/* 상단 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff' }}>
            <TouchableOpacity
              onPress={onBack}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 24,
                marginRight: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={28} color="#222" />
            </TouchableOpacity>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee' }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, color: '#bbb' }}>📷</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{studyName}</Text>
            </View>
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 24,
                marginLeft: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={openMenuDrawer}
            >
              <Text style={{ fontSize: 28, color: '#222' }}>☰</Text>
            </TouchableOpacity>
          </View>
          {/* 채팅 메시지 목록 */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 12 }}
            ref={scrollViewRef}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          >
            {sortedMessages.map((msg, idx) => {
              const isMe = userInfo && String(msg.userId) === String(userInfo.id);
              const isSystemMessage = msg.sender === '시스템';
              
              // 시스템 메시지인 경우 카카오톡 스타일로 표시
              if (isSystemMessage) {
                return (
                  <React.Fragment key={msg.id || msg._id || (msg.sentAt + '_' + (msg.userId || '') + '_' + idx)}>
                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                      <View style={{
                        backgroundColor: '#f0f0f0',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        maxWidth: '80%',
                      }}>
                        <Text style={{ 
                          color: '#666', 
                          fontSize: 13, 
                          textAlign: 'center',
                          fontWeight: '400'
                        }}>
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              }
              
              // 날짜 구분선 표시 로직
              let showDate = false;
              const currentDate = msg.sentAt ? new Date(msg.sentAt) : null;
              const prevMsg = idx > 0 ? sortedMessages[idx - 1] : null;
              const prevDate = prevMsg && prevMsg.sentAt ? new Date(prevMsg.sentAt) : null;
              if (
                currentDate &&
                (!prevDate ||
                  currentDate.getFullYear() !== prevDate.getFullYear() ||
                  currentDate.getMonth() !== prevDate.getMonth() ||
                  currentDate.getDate() !== prevDate.getDate())
              ) {
                showDate = true;
              }
              // 시간 포맷 함수
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
              // userId별 고정 색상 함수
              const avatarColors = ['#6EC6FF', '#FFD54F', '#A5D6A7', '#FF8A65', '#BA68C8', '#4DD0E1', '#F06292', '#90A4AE', '#FFF176', '#81C784'];
              function getAvatarColor(userId) {
                let hash = 0;
                const str = String(userId);
                for (let i = 0; i < str.length; i++) {
                  hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                return avatarColors[Math.abs(hash) % avatarColors.length];
              }
              // 1분 그룹 마지막(아래쪽) 메시지에만 시간 표시
              let showTime = true;
              if (idx < sortedMessages.length - 1) {
                const nextMsg = sortedMessages[idx + 1];
                if (
                  nextMsg &&
                  String(nextMsg.userId) === String(msg.userId) &&
                  Math.abs(new Date(nextMsg.sentAt) - new Date(msg.sentAt)) < 60000 // 1분 이내
                ) {
                  showTime = false;
                }
              }
              return (
                <React.Fragment key={msg.id || msg._id || (msg.sentAt + '_' + (msg.userId || '') + '_' + idx)}>
                  {showDate && (
                    <View style={{ alignItems: 'center', marginVertical: 10 }}>
                      <Text style={{ color: '#bbb', fontSize: 13 }}>
                        {`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`}
                      </Text>
                    </View>
                  )}
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    {/* 수신자(상대방)만 아이콘+이름 */}
                    {!isMe && (() => {
                      const isFirstOfGroup =
                        idx === 0 ||
                        String(sortedMessages[idx - 1].userId) !== String(msg.userId) ||
                        Math.abs(new Date(msg.sentAt) - new Date(sortedMessages[idx - 1].sentAt)) > 60000;
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
                              <View
                                style={{
                                  backgroundColor: '#fff',
                                  borderRadius: 18,
                                  padding: 12,
                                  maxWidth: 220,
                                  borderWidth: 1,
                                  borderColor: '#eee',
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.05,
                                  shadowRadius: 2,
                                  elevation: 1,
                                  alignSelf: 'flex-start',
                                }}
                              >
                                <Text style={{ color: '#333', fontSize: 15 }}>{msg.content}</Text>
                                {msg.imageUrl ? (
                                  <Image source={{ uri: msg.imageUrl }} style={{ width: 180, height: 120, borderRadius: 10, marginTop: 4 }} />
                                ) : null}
                              </View>
                              {showTime && <Text style={{ fontSize: 11, color: '#888', marginLeft: 4, marginBottom: 2 }}>
                                {msg.sentAt ? formatTime(msg.sentAt) : ''}
                              </Text>}
                            </View>
                          </View>
                        </>
                      );
                    })()}
                    {/* 내 메시지(오른쪽)는 시간-말풍선 순서 */}
                    {isMe && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                          {showTime && (
                            <Text style={{ fontSize: 11, color: '#888', marginRight: 4, marginBottom: 2 }}>
                              {msg.sentAt ? formatTime(msg.sentAt) : ''}
                            </Text>
                          )}
                          <View
                            style={{
                              backgroundColor: '#4CAF50',
                              borderRadius: 18,
                              padding: 12,
                              maxWidth: 220,
                              borderWidth: 0,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                              alignSelf: 'flex-end',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 15 }}>{msg.content}</Text>
                            {msg.imageUrl ? (
                              <Image source={{ uri: msg.imageUrl }} style={{ width: 180, height: 120, borderRadius: 10, marginTop: 4 }} />
                            ) : null}
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
          {/* 입력창 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 12, height: 48 }}>
              <TouchableOpacity onPress={pickAndSendImage} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="camera" size={20} color="#888" />
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
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
                autoFocus={!showMenuDrawer}
              />
            </View>
            <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()} style={{ marginLeft: 8, padding: 8 }}>
              <Text style={{ fontSize: 34, color: sending || !input.trim() ? '#aaa' : '#4A90E2' }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // 공고 모두보기 화면
  const JobPostingsScreen = (): JSX.Element => {
    const [jobPostings, setJobPostings] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [filteredJobPostings, setFilteredJobPostings] = useState<any[]>([]);
    const [searchText, setSearchText] = useState<string>('');
    const [showJobSearchModal, setShowJobSearchModal] = useState<boolean>(false);

    // 공고 목록 가져오기 (더미 데이터)
    useEffect(() => {
      const dummyJobPostings = [
        {
          id: 1,
          imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500',
          title: 'WIFI SW 개발자 채용',
          companyName: '(주)블루버드',
          category: '코딩',
        },
        {
          id: 2,
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500',
          title: '파이썬 초/중급자 개발자 채용',
          companyName: '(주)씨텍',
          category: '코딩',
        },
        {
          id: 3,
          imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500',
          title: '풀스택 개발자 모집',
          companyName: '소프트웨어기업',
          category: '코딩',
        },
        {
          id: 4,
          imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500',
          title: '모바일 앱 개발자 채용',
          companyName: '모바일플랫폼',
          category: '코딩',
        },
        {
          id: 5,
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500',
          title: '데이터 엔지니어 채용',
          companyName: '데이터회사',
          category: '코딩',
        },
        {
          id: 6,
          imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=500',
          title: 'DevOps 엔지니어 모집',
          companyName: '클라우드기업',
          category: '코딩',
        },
        {
          id: 7,
          imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500',
          title: 'UI/UX 디자이너 채용',
          companyName: '디자인스튜디오',
          category: '디자인',
        },
        {
          id: 8,
          imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500',
          title: '그래픽 디자이너 모집',
          companyName: '크리에이티브',
          category: '디자인',
        },
        {
          id: 9,
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500',
          title: '영어 강사 채용',
          companyName: '어학원',
          category: '언어/어학',
        },
        {
          id: 10,
          imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500',
          title: '일본어 강사 모집',
          companyName: '외국어학원',
          category: '언어/어학',
        },
        {
          id: 11,
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500',
          title: '신입 개발자 채용',
          companyName: 'IT기업',
          category: '취업/이직',
        },
        {
          id: 12,
          imageUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=500',
          title: '경력 개발자 모집',
          companyName: '테크기업',
          category: '취업/이직',
        },
      ];
      setJobPostings(dummyJobPostings);
      setFilteredJobPostings(dummyJobPostings);
    }, []);

    // 카테고리 및 검색 필터링
    useEffect(() => {
      let filtered = [...jobPostings];
      
      // 카테고리 필터링
      if (selectedCategory !== 'all') {
        const categoryName = categoryList.find(cat => String(cat.id) === String(selectedCategory))?.name || '';
        filtered = filtered.filter(job => job.category === categoryName);
      }
      
      // 검색 필터링
      if (searchText.trim()) {
        const searchQuery = searchText.toLowerCase().trim();
        filtered = filtered.filter(job => 
          (job.title && job.title.toLowerCase().includes(searchQuery)) ||
          (job.companyName && job.companyName.toLowerCase().includes(searchQuery))
        );
      }
      
      setFilteredJobPostings(filtered);
    }, [selectedCategory, jobPostings, categoryList, searchText]);

    // 왼쪽 스와이프 제스처 (뒤로가기)
    const swipeGesture = Gesture.Fling()
      .direction(1) // 오른쪽 방향 (왼쪽에서 오른쪽으로 스와이프)
      .onEnd(() => {
        setActiveTab('dashboard');
      });

    return (
      <GestureDetector gesture={swipeGesture}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity 
                onPress={() => setActiveTab('dashboard')} 
                style={{ padding: 5, marginRight: 10 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
              <Text style={{ fontSize: 25, fontWeight: '600' }}>
                공고 모집
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowJobSearchModal(true)} style={{ padding: 5 }}>
                <Ionicons name="search" size={24} color="#222" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.container}>
            <View style={{ height: 0 }} />
            <View style={styles.studyListSection}>
              <CategoryFilterBar
                categoryList={categoryList}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                styles={styles}
              />
              {searchText.trim() && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      "{searchText}" 검색 결과: {filteredJobPostings.length}개
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setSearchText('')}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' }}>
                  {filteredJobPostings && filteredJobPostings.length > 0 ? (
                    filteredJobPostings.map((job) => (
                      <TouchableOpacity
                        key={job?.id || Math.random()}
                        style={[styles.jobCard, { marginBottom: 16, alignSelf: 'center', width: '100%', maxWidth: 400 }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedJob(job);
                          setActiveScreen('job-detail');
                        }}
                      >
                        {job?.imageUrl ? (
                          <Image 
                            source={{ uri: job.imageUrl }} 
                            style={styles.jobImage} 
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.jobImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ fontSize: 40, color: '#ccc' }}>💼</Text>
                          </View>
                        )}
                        <View style={styles.jobContent}>
                          <Text style={styles.jobTitle} numberOfLines={2}>{job?.title || '제목 없음'}</Text>
                          <Text style={styles.jobCompanyName} numberOfLines={1}>{job?.companyName || '회사명 없음'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>공고가 없습니다</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
          
          {/* 공고 검색 모달 */}
          <Modal
            transparent={true}
            visible={showJobSearchModal}
            onRequestClose={() => setShowJobSearchModal(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowJobSearchModal(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={[styles.centerModalContent, styles.searchModalContent]}>
                    <View style={styles.searchContainer}>
                      <View style={styles.searchInputContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="공고 제목 또는 회사명을 입력하세요"
                          value={searchText}
                          onChangeText={setSearchText}
                          returnKeyType="search"
                          onSubmitEditing={() => setShowJobSearchModal(false)}
                          autoFocus
                        />
                        {searchText.length > 0 && (
                          <TouchableOpacity 
                            onPress={() => {
                              setSearchText('');
                              setShowJobSearchModal(false);
                            }}
                            style={{ padding: 8, marginRight: 8 }}
                          >
                            <Ionicons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.searchButton}
                          onPress={() => setShowJobSearchModal(false)}
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
        </SafeAreaView>
      </GestureDetector>
    );
  };

  // 알림 페이지
  const NotificationScreen = ({ userInfo, onBack }: { userInfo: any; onBack: () => void }): JSX.Element => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchNotifications = async () => {
        try {
          setLoading(true);
          // 더미 알림 데이터 (실제 API 연동 시 변경)
          const dummyNotifications = [
            {
              id: 1,
              type: 'study_invite',
              title: '스터디 초대',
              message: 'Spring Boot 스터디에 초대되었습니다.',
              studyName: 'Spring Boot 스터디',
              studyId: 1,
              read: false,
              createdAt: '2025-11-04T10:30:00',
            },
            {
              id: 2,
              type: 'chat_message',
              title: '새 메시지',
              message: 'React Native 스터디에서 새로운 메시지가 도착했습니다.',
              studyName: 'React Native 스터디',
              studyId: 2,
              chatId: 2,
              read: false,
              createdAt: '2025-11-04T09:15:00',
            },
            {
              id: 3,
              type: 'schedule',
              title: '일정 알림',
              message: '알고리즘 문제 풀이 스터디 일정이 1시간 후에 시작됩니다.',
              studyName: '알고리즘 문제 풀이',
              studyId: 3,
              read: true,
              createdAt: '2025-11-03T14:20:00',
            },
            {
              id: 4,
              type: 'announcement',
              title: '공지사항',
              message: 'GrewMeet 서비스 업데이트 안내가 게시되었습니다.',
              read: true,
              createdAt: '2025-11-02T16:45:00',
            },
            {
              id: 5,
              type: 'study_join',
              title: '스터디 참여',
              message: '취업 준비 스터디에 참여 신청이 승인되었습니다.',
              studyName: '취업 준비 스터디',
              studyId: 4,
              read: false,
              createdAt: '2025-11-01T11:00:00',
            },
          ];
          
          // 날짜순으로 정렬 (최신순)
          dummyNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setNotifications(dummyNotifications);
        } catch (error) {
          console.error('알림 목록 가져오기 실패:', error);
          setNotifications([]);
        } finally {
          setLoading(false);
        }
      };

      fetchNotifications();
    }, []);

    const handleNotificationPress = (notification: any) => {
      // 알림 읽음 처리
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );

      // 알림 타입에 따라 다른 동작
      if (notification.type === 'study_invite' || notification.type === 'study_join') {
        // 스터디 상세 페이지로 이동 (현재는 Alert로 대체)
        Alert.alert(
          notification.title,
          `${notification.message}\n\n스터디에 참여하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '확인', 
              onPress: () => {
                // 스터디 참여 로직
                if (notification.studyId) {
                  // 스터디 상세 또는 참여 처리
                }
              }
            },
          ]
        );
      } else if (notification.type === 'chat_message') {
        // 채팅방으로 이동
        if (notification.chatId && notification.studyId) {
          setActiveChat({
            chatRoomId: notification.chatId,
            studyName: notification.studyName,
            studyRoomId: notification.studyId,
          });
          setActiveScreen('chat');
        }
      } else if (notification.type === 'schedule') {
        // 일정 상세 페이지로 이동 (현재는 Alert로 대체)
        Alert.alert(notification.title, notification.message);
      } else if (notification.type === 'announcement') {
        // 공지사항 페이지로 이동 (현재는 Alert로 대체)
        Alert.alert(notification.title, notification.message);
      }
    };

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return '방금 전';
      if (minutes < 60) return `${minutes}분 전`;
      if (hours < 24) return `${hours}시간 전`;
      if (days < 7) return `${days}일 전`;
      
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const getNotificationIcon = (type: string): string => {
      switch (type) {
        case 'study_invite':
        case 'study_join':
          return 'people-outline';
        case 'chat_message':
          return 'chatbubble-outline';
        case 'schedule':
          return 'calendar-outline';
        case 'announcement':
          return 'megaphone-outline';
        default:
          return 'notifications-outline';
      }
    };

    const getNotificationColor = (type: string): string => {
      switch (type) {
        case 'study_invite':
        case 'study_join':
          return '#4CAF50';
        case 'chat_message':
          return '#2196F3';
        case 'schedule':
          return '#FF9800';
        case 'announcement':
          return '#9C27B0';
        default:
          return '#6B7280';
      }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ width: 34 }}>
              <TouchableOpacity onPress={onBack} style={{ padding: 5 }}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>알림</Text>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 34 }} />
          </View>

          {/* 알림 목록 */}
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>로딩 중...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
              <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 16 }}>알림이 없습니다</Text>
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handleNotificationPress(notification)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: getNotificationColor(notification.type),
                    opacity: notification.read ? 0.7 : 1,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20, 
                      backgroundColor: `${getNotificationColor(notification.type)}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Ionicons 
                        name={getNotificationIcon(notification.type) as any} 
                        size={20} 
                        color={getNotificationColor(notification.type)} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: notification.read ? '400' : '600', color: '#111827', flex: 1 }}>
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 8 }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8, lineHeight: 20 }}>
                        {notification.message}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {formatDate(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  // 내 정보 페이지
  const ProfileScreen = ({ userInfo, onBack }: { userInfo: any; onBack: () => void }): JSX.Element => {
    const [myStudies, setMyStudies] = useState<StudyRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchMyStudies = async () => {
        try {
          setLoading(true);
          const token = await SecureStore.getItemAsync('auth_token');
          if (!token || !userInfo?.email) return;

          // 이메일로 사용자의 스터디룸 조회
          const encodedEmail = encodeURIComponent(userInfo.email);
          const res = await axios.get(`${BASE_URL}/api/study/user/email/${encodedEmail}/rooms`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (res.data && Array.isArray(res.data)) {
            // API 응답 데이터를 StudyRoom 형식으로 변환
            const studyRooms = res.data.map((room: any) => ({
              id: room.id,
              name: room.name,
              imageUrl: room.imageUrl || '',
              chatId: room.chatId,
              studyRoomHostId: room.studyRoomHostId,
              categoriesId: room.categoriesId,
              participants: [],
              description: room.description || '',
              hashtags: room.hashtags || '',
              region: room.region || '',
              password: room.password || '',
              peopleCount: room.peopleCount || 0,
              hostName: room.hostName || '호스트',
              created_at: room.created_at || new Date().toISOString(),
              lastMsg: null,
            }));
            setMyStudies(studyRooms);
          }
        } catch (error) {
          console.error('내 스터디 목록 가져오기 실패:', error);
          setMyStudies([]);
        } finally {
          setLoading(false);
        }
      };

      if (userInfo) {
        fetchMyStudies();
      }
    }, [userInfo]);

    if (!userInfo) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text>사용자 정보를 불러올 수 없습니다.</Text>
            <TouchableOpacity onPress={onBack} style={{ marginTop: 20, padding: 10, backgroundColor: '#4CAF50', borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>뒤로가기</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ width: 34 }}>
              <TouchableOpacity onPress={onBack} style={{ padding: 5 }}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', flex: 1, textAlign: 'center', color: '#111827' }}>내 정보</Text>
            <View style={{ width: 34 }} />
          </View>

          {/* 프로필 섹션 */}
          <View style={{ backgroundColor: '#fff', padding: 24, marginTop: 0, alignItems: 'center' }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 40, color: '#fff', fontWeight: '600' }}>
                {userInfo?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              {userInfo?.name || '사용자'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              {userInfo?.email || ''}
            </Text>
          </View>

          {/* 통계 섹션 */}
          <View style={{ backgroundColor: '#fff', marginTop: 12, marginHorizontal: 20, borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>활동 통계</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                  {myStudies.length}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>참여 중인 스터디</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#E5E7EB' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                  {myStudies.filter(s => {
                    // studyRoomHostId와 userInfo.id 또는 userInfo.uuid를 문자열로 변환하여 비교
                    const hostId = String(s.studyRoomHostId || '');
                    const userId = String(userInfo?.id || userInfo?.uuid || '');
                    return hostId && userId && hostId === userId;
                  }).length}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>운영 중인 스터디</Text>
              </View>
            </View>
          </View>

          {/* 참여 중인 스터디 목록 */}
          <View style={{ backgroundColor: '#fff', marginTop: 12, marginHorizontal: 20, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>참여 중인 스터디</Text>
            {loading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>로딩 중...</Text>
              </View>
            ) : myStudies.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>참여 중인 스터디가 없습니다.</Text>
              </View>
            ) : (
              <View>
                {myStudies.map((study) => (
                  <TouchableOpacity
                    key={study.id}
                    onPress={() => {
                      if (study.chatId) {
                        setActiveChat({
                          chatRoomId: study.chatId,
                          studyName: study.name,
                          imageUrl: study.imageUrl,
                          studyRoomId: study.id,
                          studyRoomHostId: study.studyRoomHostId || undefined,
                        });
                        setActiveScreen('chat');
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                    }}
                    activeOpacity={0.7}
                  >
                    {study.imageUrl ? (
                      <Image
                        source={{ uri: study.imageUrl }}
                        style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#E5E7EB' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#E5E7EB', marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20 }}>📚</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                        {study.name}
                      </Text>
                      {(() => {
                        // studyRoomHostId와 userInfo.id 또는 userInfo.uuid를 문자열로 변환하여 비교
                        const hostId = String(study.studyRoomHostId || '');
                        const userId = String(userInfo?.id || userInfo?.uuid || '');
                        return hostId && userId && hostId === userId;
                      })() && (
                        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                          <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '600' }}>방장</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // 공고 상세 페이지
  const JobDetailScreen = ({ job, onBack }: { job: any; onBack: () => void }): JSX.Element => {
    if (!job) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text>공고 정보를 불러올 수 없습니다.</Text>
            <TouchableOpacity onPress={onBack} style={{ marginTop: 20, padding: 10, backgroundColor: '#4CAF50', borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>뒤로가기</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <View style={{ width: 34 }}>
              <TouchableOpacity onPress={onBack} style={{ padding: 5 }}>
                <Ionicons name="arrow-back" size={24} color="#222" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' }}>공고 상세</Text>
            <View style={{ width: 34 }} />
          </View>

          {/* 회사 이미지 */}
          {job.imageUrl ? (
            <Image 
              source={{ uri: job.imageUrl }} 
              style={{ width: '100%', height: 250, backgroundColor: '#f0f0f0' }} 
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: '100%', height: 250, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 60, color: '#ccc' }}>💼</Text>
            </View>
          )}

          {/* 채용 정보 */}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 8 }}>
              {job.title || '제목 없음'}
            </Text>
            <Text style={{ fontSize: 18, color: '#666', marginBottom: 20 }}>
              {job.companyName || '회사명 없음'}
            </Text>

            {/* 채용 상세 정보 */}
            <View style={{ backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Ionicons name="briefcase-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>직무:</Text> {job.title || '채용 공고'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Ionicons name="business-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>회사:</Text> {job.companyName || '회사명'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Ionicons name="location-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>지역:</Text> 서울 강남구
                </Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Ionicons name="time-outline" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: '#333', flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>근무 형태:</Text> 정규직
                </Text>
              </View>
            </View>

            {/* 회사 소개 */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                회사 소개
              </Text>
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 24 }}>
                {job.companyName || '회사명'}은 혁신적인 기술과 서비스를 제공하는 기업입니다. 
                우리는 전문성과 열정을 갖춘 인재를 찾고 있습니다. 
                함께 성장하며 미래를 만들어가는 동료를 기다립니다.
              </Text>
            </View>

            {/* 주요 업무 */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                주요 업무
              </Text>
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 24 }}>
                • {job.title || '채용 공고'} 관련 업무 수행{'\n'}
                • 프로젝트 기획 및 개발{'\n'}
                • 팀 협업 및 커뮤니케이션{'\n'}
                • 지속적인 학습 및 성장
              </Text>
            </View>

            {/* 자격 요건 */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                자격 요건
              </Text>
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 24 }}>
                • 관련 분야 경력 또는 프로젝트 경험{'\n'}
                • 문제 해결 능력 및 커뮤니케이션 능력{'\n'}
                • 팀워크와 협업에 대한 열정{'\n'}
                • 지속적인 학습 의지
              </Text>
            </View>

            {/* 우대 사항 */}
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
                우대 사항
              </Text>
              <Text style={{ fontSize: 15, color: '#666', lineHeight: 24 }}>
                • 관련 자격증 보유{'\n'}
                • 오픈소스 기여 경험{'\n'}
                • 포트폴리오 또는 깃허브 활동{'\n'}
                • 다양한 프로젝트 경험
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* 지원 버튼 */}
        <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#000',
              borderRadius: 10,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={async () => {
              const url = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?isMypage=no&rec_idx=52016536&recommend_ids=eJxFzcERQzEIQ8FqcpcEGDinkPTfRYgz3z6u32CF0LWKn2K%2B8h1Dg%2FzT0J%2FsdEzFJpvuPuTDWBrWplDyPmQj6M%2FP7E5ZnSEBLjtDFFNxblGRnqcKubSeygJNvGwyb%2B0wu0NDWvipXOxdN9Fe83Z3jUTfr%2BY67McvNn9AFw%3D%3D&view_type=search&searchword=%EA%B0%9C%EB%B0%9C%EC%9E%90&searchType=search&gz=1&t_ref_content=generic&t_ref=search&relayNonce=63a721cdd50f57bad03d&paid_fl=n&search_uuid=bb58f8e1-3674-4e2c-8523-e361f0dba487&immediately_apply_layer_open=n#seq=0';
              try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('오류', 'URL을 열 수 없습니다.');
                }
              } catch (error) {
                Alert.alert('오류', 'URL을 열 수 없습니다.');
              }
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              지원하기
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  // StudyListScreen 헤더에 로그아웃 버튼 추가
  const StudyListScreen = (): JSX.Element => {
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    // StudyListScreen에서 새로고침 상태 관리
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = async () => {
      setRefreshing(true);
      await fetchStudyList();
      setRefreshing(false);
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
          <Text style={{ fontSize: 25, fontWeight: '600',marginLeft: 10 }}>
            스터디 공간
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowSearchModal(true)} style={{ padding: 5 }}>
              <Ionicons name="search" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreen('create')} style={{ padding: 5, marginLeft: 2, marginTop: -3 }}>
              <Ionicons name="create-outline" size={28} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.container}>
          {/* 상단과 카테고리 버튼 사이 간격 완전히 제거 */}
          <View style={{ height: 0 }} />
          <View style={styles.studyListSection}>
            <CategoryFilterBar
              categoryList={categoryList}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              styles={styles}
            />
            <ScrollView
              style={styles.studyListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    setRefreshing(true);
                    await fetchStudyList();
                    setFilteredStudyData((data) => data); // 강제 리렌더
                    setRefreshing(false);
                  }}
                  colors={["#4CAF50"]}
                />
              }
            >
              {(() => {
                const filtered = (Array.isArray(filteredStudyData) ? filteredStudyData : [])
                  .filter(study => selectedCategory === 'all' || study.categoriesId === selectedCategory);
                if (filtered.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Text style={{ color: '#888', fontSize: 16 }}>아직 스터디룸이 없습니다.</Text>
                    </View>
                  );
                }
                return filtered.map((study) => {
                  // created_at에서 년-월-일만 추출
                  let createdDate = '';
                  if (study?.created_at) {
                    const d = new Date(study.created_at);
                    createdDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }
                  const currentCount = (participantCounts && study?.id in participantCounts) ? participantCounts[study.id] : '-';
                  // 카테고리명 찾기
                  const categoryName = Array.isArray(categoryList)
                    ? (categoryList.find(cat => cat.id === study?.categoriesId)?.name || '')
                    : '';
                  return (
                    <TouchableOpacity
                      key={study?.id ?? Math.random()}
                      style={styles.studyListItem}
                      onPress={() => {
                        // 본인이 방장 or 이미 참여중인 방이면 바로 입장
                        const isHost = userInfo && study?.studyRoomHostId === userInfo.id;
                        const isParticipant = Array.isArray(study?.participants)
                          ? study.participants.some(p => p.userId === userInfo?.id)
                          : false;
                        if (isHost || isParticipant) {
                          setChatEntrySource('study');
                          setActiveScreen('chat');
                          setActiveChat({ chatRoomId: study?.chatId, studyName: study?.name, imageUrl: study?.imageUrl, studyRoomId: study?.id, studyRoomHostId: study?.studyRoomHostId });
                        } else {
                          setJoinModal({ visible: true, study, password: '' });
                        }
                      }}
                    >
                      <View style={[styles.studyItemContent, { marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {study?.imageUrl ? (
                            <Image source={{ uri: study.imageUrl }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
                          ) : (
                            <View style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#aaa', fontSize: 18 }}>📷</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            {/* 카테고리 박스 */}
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
                            </View>
                            <View style={styles.studyHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                  <Text style={styles.studyTitle}>
                                    {study?.name ?? '-'}
                                  </Text>
                                  {study?.password ? (
                                    <Ionicons name="lock-closed-outline" size={15} color="#888" style={{ marginLeft: 5, marginTop: 1 }} />
                                  ) : null}
                                </View>
                                {study?.description ? (
                                  <Text style={styles.studyDescription}>{study.description}</Text>
                                ) : null}
                                {study?.hashtags && study.hashtags.trim() ? (
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
                                    {study.hashtags.split(',').filter(tag => tag.trim()).map((tag, index) => (
                                      <View key={index} style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 4, marginBottom: 4 }}>
                                        <Text style={{ color: '#1976D2', fontSize: 11 }}>#{tag.trim()}</Text>
                                      </View>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                              <View style={{ alignItems: 'flex-end', minWidth: 60, marginTop: 30 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <Ionicons name="person" size={15} color="#222" style={{ marginRight: 3 }} />
                                  <Text style={[styles.studyProgress, { color: '#222' }]}>{currentCount}/{study?.peopleCount ?? '-'}명</Text>
                                </View>
                                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
                                  {study.lastMsg?.sentAt ? getTimeAgo(study.lastMsg.sentAt) : ''}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.studyInfo}>
                              {/* 방장 이름은 위로 이동 */}
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
          <SearchModal 
          visible={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSearch={setFilteredStudyData}
          studyList={studyList}
          styles={styles}
        />
        <ScheduleModal
          visible={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          meetingList={meetingList}
          styles={styles}
        />
        </View>
      </SafeAreaView>
    );
  };

  // MoreScreen 헤더에도 로그아웃 버튼 추가
  const MoreScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 25, fontWeight: '600' }}>더보기</Text>
      </View>
      <View style={styles.container}>
        <View style={styles.moreSection}>
          <TouchableOpacity style={styles.moreItem}>
            <View style={styles.moreItemContent}>
              <View style={styles.moreIconContainer}>
                <Text style={styles.moreIcon}>🔗</Text>
              </View>
              <View style={styles.moreTextContainer}>
                <Text style={styles.moreItemTitle}>다른 서비스로 이동하기</Text>
                <Text style={styles.moreItemSubtitle}>연결된 다른 서비스를 이용해보세요</Text>
              </View>
            </View>
            <Text style={styles.moreArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreItem}>
            <View style={styles.moreItemContent}>
              <View style={styles.moreIconContainer}>
                <Text style={styles.moreIcon}>⚙️</Text>
              </View>
              <View style={styles.moreTextContainer}>
                <Text style={styles.moreItemTitle}>설정</Text>
                <Text style={styles.moreItemSubtitle}>앱 설정을 관리하세요</Text>
              </View>
            </View>
            <Text style={styles.moreArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // 커뮤니티 화면
  const CommunityScreen = () => {
    const [showCreate, setShowCreate] = useState(false);
    const [showCommunitySearch, setShowCommunitySearch] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [commentInput, setCommentInput] = useState('');
    const [markdownPreview, setMarkdownPreview] = useState('');
    const [communityPosts, setCommunityPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [communityLoading, setCommunityLoading] = useState(false);
    const [communityError, setCommunityError] = useState('');
    const [codeInput, setCodeInput] = useState('');

    // 언어 감지 함수 (간단 버전)
    const detectCodeLanguage = (content) => {
      const match = content.match(/```(\w+)/);
      return match ? match[1] : undefined;
    };

    // 커뮤니티 API 연동
    const fetchCommunityPosts = async () => {
      setCommunityLoading(true);
      setCommunityError('');
      try {
        const res = await axios.get(`${BASE_URL}/api/community`);
        setCommunityPosts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setCommunityError('게시글 목록을 불러오지 못했습니다.');
      }
      setCommunityLoading(false);
    };
    const fetchCommunityPost = async (id) => {
      setCommunityLoading(true);
      setCommunityError('');
      try {
        const res = await axios.get(`${BASE_URL}/api/community/${id}`);
        setSelectedPost(res.data);
      } catch (e) {
        setCommunityError('게시글을 불러오지 못했습니다.');
      }
      setCommunityLoading(false);
    };
    const createCommunityPost = async (title, content) => {
      setCommunityLoading(true);
      setCommunityError('');
      try {
        const codeLanguage = detectCodeLanguage(content);
        const res = await axios.post(`${BASE_URL}/api/community`, {
          title, content, authorId: userInfo?.id, authorName: userInfo?.name, codeLanguage
        });
        await fetchCommunityPosts();
        return res.data;
      } catch (e) {
        setCommunityError('게시글 작성에 실패했습니다.');
      }
      setCommunityLoading(false);
    };
    const deleteCommunityPost = async (id) => {
      setCommunityLoading(true);
      setCommunityError('');
      try {
        await axios.delete(`${BASE_URL}/api/community/${id}`);
        await fetchCommunityPosts();
        setSelectedPost(null);
      } catch (e) {
        setCommunityError('게시글 삭제에 실패했습니다.');
      }
      setCommunityLoading(false);
    };
    // 댓글
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const fetchComments = async (postId) => {
      setCommentsLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/community/${postId}/comments`);
        setComments(Array.isArray(res.data) ? res.data : []);
      } catch {
        setComments([]);
      }
      setCommentsLoading(false);
    };
    const createComment = async (postId, content) => {
      setCommentsLoading(true);
      try {
        const codeLanguage = detectCodeLanguage(content);
        await axios.post(`${BASE_URL}/api/community/${postId}/comments`, {
          content, authorId: userInfo?.id, authorName: userInfo?.name, codeLanguage
        });
        await fetchComments(postId);
        await fetchCommunityPosts(); // 댓글 수 갱신
      } catch {}
      setCommentsLoading(false);
    };
    const deleteComment = async (commentId, postId) => {
      setCommentsLoading(true);
      try {
        await axios.delete(`${BASE_URL}/api/community/comments/${commentId}`);
        await fetchComments(postId);
      } catch {}
      setCommentsLoading(false);
    };

    // 게시글 작성
    const handleCreatePost = () => {
      if (!newTitle.trim() || !newContent.trim()) {
        Alert.alert('제목과 내용을 입력하세요');
        return;
      }
      setCommunityPosts(prev => [
        {
          id: Date.now(),
          title: newTitle,
          content: newContent,
          comments: [],
          createdAt: new Date().toISOString(),
          author: userInfo?.name || '익명',
        },
        ...prev
      ]);
      setNewTitle('');
      setNewContent('');
      setShowCreate(false);
    };

    // 댓글 작성
    const handleAddComment = () => {
      if (!commentInput.trim() || !selectedPost) return;
      createComment(selectedPost.id, commentInput);
      setCommentInput('');
    };

    // 마크다운 미리보기
    const renderMarkdown = (md) => {
      // 아주 간단한 마크다운 변환 (bold, code, pre)
      let html = md
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br/>');
      return html;
    };

    // 게시글/댓글 렌더링 시 코드블록 하이라이트
    const renderMarkdownWithHighlight = (md, codeLanguage) => {
      // 코드블록(```lang ... ```)만 하이라이트, 나머지는 Text로
      const regex = /```(\w+)?([\s\S]*?)```/g;
      let lastIndex = 0;
      let elements = [];
      let match;
      let idx = 0;
      while ((match = regex.exec(md)) !== null) {
        if (match.index > lastIndex) {
          elements.push(<Text key={idx++}>{md.slice(lastIndex, match.index)}</Text>);
        }
        elements.push(
          <SyntaxHighlighter
            key={idx++}
            language={match[1] || codeLanguage || 'text'}
            style={atomOneDark}
            highlighter="hljs"
            customStyle={{ borderRadius: 8, marginVertical: 6 }}
          >
            {match[2]}
          </SyntaxHighlighter>
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < md.length) {
        elements.push(<Text key={idx++}>{md.slice(lastIndex)}</Text>);
      }
      return elements;
    };

    // 커뮤니티 검색 모달 (스터디룸 SearchModal 참고, 간단 버전)
    const [communitySearch, setCommunitySearch] = useState('');
    const handleCommunitySearch = () => {
      if (!communitySearch.trim()) {
        fetchCommunityPosts();
        setShowCommunitySearch(false);
        return;
      }
      const searchQuery = communitySearch.toLowerCase().trim();
      setCommunityPosts(posts => posts.filter(post => post.title.toLowerCase().includes(searchQuery)));
      setShowCommunitySearch(false);
    };
    const CommunitySearchModal = () => (
      <Modal
        visible={showCommunitySearch}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCommunitySearch(false)}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowCommunitySearch(false)}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, minWidth: 220 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>게시글 검색</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 12, minWidth: 180 }}
              placeholder="제목으로 검색"
              value={communitySearch}
              onChangeText={setCommunitySearch}
              onSubmitEditing={handleCommunitySearch}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity onPress={handleCommunitySearch} style={{ backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>검색</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );

    useEffect(() => {
      fetchCommunityPosts();
    }, []);

    useEffect(() => {
      if (selectedPost?.id) fetchComments(selectedPost.id);
    }, [selectedPost?.id]);

    if (showCreate) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={{ padding: 6, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={28} color="#222" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>게시글 작성</Text>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="제목"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 15, minHeight: 80, marginBottom: 16, textAlignVertical: 'top' }}
              placeholder="내용을 입력하세요"
              value={newContent}
              onChangeText={setNewContent}
              multiline
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 16, fontFamily: 'Menlo', textAlignVertical: 'top', backgroundColor: '#fafafa' }}
              placeholder="코드 입력(선택)"
              value={codeInput}
              onChangeText={setCodeInput}
              multiline
            />
            <TouchableOpacity
              style={{ backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
              onPress={async () => {
                if (!newTitle.trim() || !newContent.trim()) {
                  Alert.alert('제목과 내용을 입력하세요');
                  return;
                }
                let content = newContent;
                if (codeInput.trim()) {
                  content += `\n\n\n${codeInput}\n\n\n`;
                }
                await createCommunityPost(newTitle, content);
                setNewTitle('');
                setNewContent('');
                setCodeInput('');
                setShowCreate(false);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>등록</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    if (selectedPost) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <TouchableOpacity onPress={() => setSelectedPost(null)} style={{ padding: 6, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={28} color="#222" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>게시글</Text>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{selectedPost.title}</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>{selectedPost.author} · {new Date(selectedPost.createdAt).toLocaleString()}</Text>
            <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, minHeight: 60, backgroundColor: '#fafafa', marginBottom: 20 }}>
              {renderMarkdownWithHighlight(selectedPost.content, selectedPost.codeLanguage)}
            </View>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>댓글 (코드 리뷰)</Text>
            {comments.length === 0 ? (
              <Text style={{ color: '#888', marginBottom: 12 }}>아직 댓글이 없습니다.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={{ marginBottom: 14, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                  <Text style={{ fontWeight: '500', marginBottom: 2 }}>{c.authorName || c.author} · {new Date(c.createdAt).toLocaleString()}</Text>
                  {renderMarkdownWithHighlight(c.content, c.codeLanguage)}
                </View>
              ))
            )}
            <TextInput
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, fontSize: 15, minHeight: 40, marginTop: 10, marginBottom: 8, textAlignVertical: 'top' }}
              placeholder="댓글을 입력하세요 (코드 리뷰, 마크다운 지원)"
              value={commentInput}
              onChangeText={setCommentInput}
              multiline
            />
            <TouchableOpacity onPress={handleAddComment} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>댓글 등록</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // 커뮤니티 메인 화면 헤더 (스터디룸과 동일)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
          <Text style={{ fontSize: 25, fontWeight: '600' }}>커뮤니티</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowCommunitySearch(true)} style={{ padding: 5 }}>
              <Ionicons name="search" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(true)} style={{ padding: 5, marginLeft: 2, marginTop: -3 }}>
              <Ionicons name="create-outline" size={28} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {communityLoading ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}><Text>로딩 중...</Text></View>
          ) : communityPosts.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}><Text style={{ color: '#888', fontSize: 16 }}>아직 게시글이 없습니다</Text></View>
          ) : (
            [...communityPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(post => (
              <TouchableOpacity
                key={post.id}
                style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, paddingVertical: 10 }}
                onPress={async () => {
                  await increasePostViews(post.id);
                  fetchCommunityPosts();
                  setSelectedPost(post);
                }}
              >
                <Text
                  style={{ fontSize: 17, fontWeight: 'normal', marginBottom: 6 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {post.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: '#888', fontSize: 13, flexShrink: 1, minWidth: 0 }} numberOfLines={1} ellipsizeMode="tail">글쓴이: {post.authorName || post.author}</Text>
                  <Text style={{ color: '#888', fontSize: 13, marginLeft: 12 }} numberOfLines={1} ellipsizeMode="tail">조회수: {typeof post.views === 'number' ? post.views : 0}</Text>
                  <Text style={{ color: '#888', fontSize: 13, marginLeft: 12 }} numberOfLines={1} ellipsizeMode="tail">댓글: {typeof post.commentsCount === 'number' ? post.commentsCount : 0}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <CommunitySearchModal />
      </SafeAreaView>
    );
  };

  // renderScreen: userInfo가 없으면 아무것도 렌더링하지 않음 (로딩 중)
  const renderScreen = () => {
    if (!userInfo) {
      return null; // 또는 로딩 화면
    }
    if (activeScreen === 'chat') {
      return <ChatRoomScreen chatRoomId={activeChat.chatRoomId} studyName={activeChat.studyName} imageUrl={activeChat.imageUrl} onBack={() => {
        if (chatEntrySource === 'study') {
          setActiveScreen('list');
        } else {
          setActiveScreen('chat-list');
        }
      }} userInfo={userInfo} />;
    }
    if (activeScreen === 'create') {
      return <StudyCreateScreen onCreated={() => setActiveScreen('list')} onCancel={() => setActiveScreen('list')} categoryList={categoryList} fetchStudyList={fetchStudyList} userInfo={userInfo} />;
    }
    if (activeScreen === 'chat-list') {
      return <ChatListScreen />;
    }
    if (activeScreen === 'community') {
      return <CommunityScreen />;
    }
    if (activeScreen === 'job-detail') {
      return <JobDetailScreen job={selectedJob} onBack={() => {
        setActiveScreen('list');
        // activeTab이 'job-postings'가 아니면 대시보드로 돌아감
        if (activeTab !== 'job-postings') {
          setActiveTab('dashboard');
        }
      }} />;
    }
    if (activeScreen === 'profile') {
      return <ProfileScreen userInfo={userInfo} onBack={() => setActiveScreen('list')} />;
    }
    if (activeScreen === 'notification') {
      return <NotificationScreen userInfo={userInfo} onBack={() => setActiveScreen('list')} />;
    }
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'study-list':
        return <StudyListScreen />;
      case 'job-postings':
        return <JobPostingsScreen />;
      case 'community':
        return <CommunityScreen />;
      case 'more':
        return <MoreScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  // handleVote 함수: 서버에 투표 저장, 투표 현황/과반수 여부 확인
  const handleVote = async (vote) => {
    try {
      // 1. 서버에 투표 저장
      await axios.post(`${BASE_URL}/api/study/meeting/vote`, {
        meetingId: meeting.id,
        userId: userInfo.id,
        vote,
      });
      // 2. 투표 현황 조회
      const votesRes = await axios.get(`${BASE_URL}/api/study/meeting/${meeting.id}/votes`);
      setVotes(
        Object.fromEntries(
          votesRes.data.map(v => [v.user.id, v.vote])
        )
      );
      // 3. 과반수 찬성 여부 확인
      const approvedRes = await axios.get(`${BASE_URL}/api/study/meeting/${meeting.id}/approved`, {
        params: { participantCount: participantCounts[chatRoomId] || 1 }
      });
      if (approvedRes.data) {
        setVoteResult('approved');
        // 일정이 모든 참여자 계정에 등록됨
      } else if (Object.keys(votesRes.data).length === (participantCounts[chatRoomId] || 1)) {
        setVoteResult('rejected');
      } else {
        setVoteResult(null);
      }
    } catch (err) {
      alert('투표 처리 중 오류: ' + (err.response?.data?.message || err.message));
    }
  };

  // 이미지 전송 함수 (ChatRoomScreen 내부)
  const pickAndSendImage = async () => {
    try {
      Alert.alert('이미지 전송', '이미지 전송 버튼이 눌렸습니다.');
      if (!chatRoomId) {
        Alert.alert('오류', '채팅방 ID가 없습니다. 방 목록에서 다시 입장해 주세요.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('오류', '이미지 접근 권한이 필요합니다.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        Alert.alert('이미지 선택됨', result.assets[0].uri);
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: 'chat_image.jpg',
          type: 'image/jpeg',
        });
        try {
          const res = await axios.post(`${BASE_URL}/api/study/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const imageUrl = res.data.url;
          Alert.alert('업로드 성공', imageUrl);
          await axios.post(`${BASE_URL}/api/chat/send`, {
            chatRoomId: chatRoomId,
            userId: userInfo.id,
            sender: userInfo.name,
            content: '',
            imageUrl,
          });
          Alert.alert('이미지 메시지 전송 성공');
          await fetchMessages(true);
        } catch (e) {
          Alert.alert('이미지 전송 실패', e.response?.data?.message || e.message);
        }
      } else {
        Alert.alert('이미지 선택이 취소되었거나 실패했습니다.');
      }
    } catch (err) {
      Alert.alert('예상치 못한 오류', err.message);
    }
  };

  // 내가 참여한 방만 가져오는 함수
  const fetchMyStudyRooms = async () => {
    if (!userInfo) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/study/${userInfo.id}/rooms`);
      const data = Array.isArray(res.data) ? res.data : [];
      setStudyList(data);
      setFilteredStudyData(data);
      fetchAllParticipantCounts(data);
    } catch (err) {
      setStudyList([]);
      setFilteredStudyData([]);
      setParticipantCounts({});
    }
  };

  // StudyListScreen 진입 시/탭 전환 시 무조건 내가 참여한 방만 보이게
  useEffect(() => {
    if (activeTab === 'study-list') {
      fetchStudyList();
    }
  }, [activeTab]);

  // ChatRoomScreen 내부 state 추가
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const menuAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // 메뉴 모달 열기 함수
  const openMenuDrawer = async () => {
    setShowMenuDrawer(true);
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setParticipantsLoading(true);
    try {
      // activeChat에서 직접 studyRoomId 가져오기
      let studyRoomId = activeChat.studyRoomId;
      
      // studyRoomId가 없으면 chatId로 조회
      if (!studyRoomId && activeChat.chatRoomId) {
        try {
          const studyRes = await axios.get(`${BASE_URL}/api/study/chat/${activeChat.chatRoomId}`);
          studyRoomId = studyRes.data.id;
        } catch {}
      }
      
      if (!studyRoomId) {
        console.log('studyRoomId가 없습니다:', activeChat);
        setParticipants([]);
        setParticipantsLoading(false);
        return;
      }
      
      console.log('참여자 목록 요청: studyRoomId=', studyRoomId);
      const res = await axios.get(`${BASE_URL}/api/study/${studyRoomId}/users`);
      const participantsRaw = Array.isArray(res.data) ? res.data : [];
      console.log('참여자 목록 응답:', participantsRaw);
      
      // userId로 이름 병합
      const participantsWithName = await Promise.all(
        participantsRaw.map(async (p) => {
          let name = '';
          try {
            const userRes = await axios.get(`${BASE_URL}/api/user/${p.userId}`);
            name = userRes.data.name || `사용자${p.userId}`;
          } catch {
            name = `사용자${p.userId}`;
          }
          return { ...p, name };
        })
      );
      setParticipants(participantsWithName);
    } catch (err) {
      console.error('참여자 목록 가져오기 실패:', err);
      setParticipants([]);
    }
    setParticipantsLoading(false);
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // 메뉴 닫기 함수
  const closeMenuDrawer = () => {
    Keyboard.dismiss(); // 드로어 닫을 때 키보드 내리기
    Animated.timing(menuAnim, {
      toValue: Dimensions.get('window').width,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setShowMenuDrawer(false));
  };

  // 방 퇴장 함수
  const handleLeaveRoom = async () => {
    const isHost = userInfo && getCurrentRoomHostId() === userInfo.id;
    
    if (isHost) {
      // 방장인 경우 스터디룸 삭제 확인
      if (!confirm('방장이 나가면 스터디룸이 완전히 삭제됩니다. 정말로 나가시겠습니까?')) return;
      
      try {
        // 시스템 메시지 전송 (삭제 전에 먼저 전송)
        try {
          await axios.post(`${BASE_URL}/api/chat/send`, {
            chatRoomId: activeChat.chatRoomId,
            userId: userInfo.id,
            sender: '시스템',
            content: '스터디룸이 삭제되었습니다.',
          });
        } catch (msgErr) {
          console.error('시스템 메시지 전송 실패:', msgErr);
        }
        
        // 스터디룸 삭제 API 호출
        await axios.delete(`${BASE_URL}/api/study/rooms/${activeChat.studyRoomId}`);
        
        // UI 업데이트
        closeMenuDrawer();
        onBack && onBack();
        
        // 스터디룸 목록 새로고침
        setTimeout(() => {
          fetchStudyList();
        }, 500); // 약간의 지연을 두어 삭제가 완료된 후 새로고침
        
      } catch (err) {
        console.error('스터디룸 삭제 에러:', err);
        alert('스터디룸 삭제 실패: ' + (err.response?.data?.message || err.message));
      }
    } else {
      // 일반 사용자인 경우 기존 로직
      if (!confirm('정말로 이 방에서 퇴장하시겠습니까?')) return;
      try {
        await axios.post(`${BASE_URL}/api/study/leave`, {
          studyRoomId: activeChat.studyRoomId,
          userId: userInfo?.id,
        });
        closeMenuDrawer();
        onBack && onBack();
      } catch (err) {
        alert('방 퇴장 실패: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const [showChatListModal, setShowChatListModal] = useState(false);

  // 참여중인 채팅방 목록 모달
  const ChatListModal = () => (
    <Modal
      transparent={true}
      visible={showChatListModal}
      onRequestClose={() => setShowChatListModal(false)}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.centerModalContent, { maxHeight: 500, width: '90%' }]}> 
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>채팅</Text>
            <TouchableOpacity 
              style={styles.closeButtonContainer}
              onPress={() => setShowChatListModal(false)}
            >
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {(Array.isArray(studyList) ? studyList : []).filter(study => study.chatId).length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
                <Text style={{ color: '#888', fontSize: 16, marginBottom: 18 }}>참여중인 채팅방이 없습니다</Text>
              </View>
            ) : (
              (Array.isArray(studyList) ? studyList : [])
                .filter(study => study.chatId)
                .map((study) => (
                  <TouchableOpacity
                    key={study.chatId}
                    style={styles.studyListItem}
                    onPress={() => {
                      if (!study.chatId) {
                        Alert.alert('채팅방 진입 불가', '이 방에는 chatId가 없습니다.\n' + JSON.stringify(study, null, 2));
                        return;
                      }
                      setChatEntrySource('chat-list');
                      setActiveScreen('chat');
                      setActiveChat({ chatRoomId: study.chatId, studyName: study.name, imageUrl: study.imageUrl, studyRoomId: study.id, studyRoomHostId: study.studyRoomHostId });
                    }}
                  >
                    <View style={styles.studyItemContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {study?.imageUrl ? (
                          <Image source={{ uri: study.imageUrl }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
                        ) : (
                          <View style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 18 }}>📷</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={styles.studyHeader}>
                            <Text style={styles.studyTitle}>{study.name}</Text>
                          </View>
                          <View style={styles.studyInfo}>
                            <Text style={styles.nextMeeting}>방장: {study?.hostName ?? '-'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


  // StudyCreateScreen 컴포넌트 추가
  const StudyCreateScreen = ({ onCreated, onCancel, categoryList, fetchStudyList, userInfo }) => {
    const [localForm, setLocalForm] = useState({
      name: '',
      category: categoryList[0]?.id || '',
      peopleCount: '',
      password: '',
      imageUrl: '',
      description: '',
      hashtags: '',
      region: '',
    });
    const [hashtagInput, setHashtagInput] = useState(''); // 입력 중인 텍스트
    const [imageUri, setImageUri] = useState('');
    const [uploading, setUploading] = useState(false);
    // 카테고리 선택 모달 상태 추가
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    // 지역 선택 상태
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);
    
    // 지역 선택 시 localForm 업데이트
    useEffect(() => {
      if (selectedCity && selectedDistrict) {
        const region = `${selectedCity} ${selectedDistrict}`;
        setLocalForm(prev => ({ ...prev, region }));
      }
    }, [selectedCity, selectedDistrict]);
    const pickImage = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('이미지 접근 권한이 필요합니다.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
        uploadImage(result.assets[0].uri);
      }
    };
    const uploadImage = async (uri) => {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'studyroom.jpg',
        type: 'image/jpeg',
      });
      try {
        const res = await axios.post(`${BASE_URL}/api/study/upload-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setLocalForm((prev) => ({ ...prev, imageUrl: res.data.url }));
      } catch (e) {
        alert('이미지 업로드 실패');
      }
      setUploading(false);
    };
    const handleCreate = async () => {
      if (!localForm.name.trim()) {
        alert('스터디명을 입력해주세요.');
        return;
      }
      if (!localForm.category) {
        alert('카테고리를 선택해주세요.');
        return;
      }
      if (!localForm.peopleCount) {
        alert('모집 인원을 입력해주세요.');
        return;
      }
      if (!localForm.imageUrl) {
        alert('대표 이미지는 필수입니다.');
        return;
      }
      if (!localForm.description.trim()) {
        alert('방 소개를 입력해주세요.');
        return;
      }
      const newRoom = {
        name: localForm.name,
        studyRoomHostId: null, // UUID가 아니므로 null로 보내고 email 사용
        hostName: userInfo?.name,
        hostEmail: userInfo?.email, // email로 User를 찾기 위해 추가
        categoriesId: localForm.category,
        peopleCount: parseInt(localForm.peopleCount, 10),
        password: localForm.password,
        imageUrl: localForm.imageUrl,
        description: localForm.description,
        hashtags: localForm.hashtags || '',
        region: localForm.region || '',
      };
      try {
        await axios.post(`${BASE_URL}/api/study`, newRoom);
        fetchStudyList && fetchStudyList();
        onCreated && onCreated();
      } catch (err) {
        alert('스터디룸 생성 실패: ' + (err.response?.data?.message || err.message));
      }
    };
    // 필수 입력값 체크 함수 (컴포넌트 내부로 이동)
    const isFormValid = () => {
      return (
        localForm.name.trim() &&
        localForm.category &&
        localForm.peopleCount &&
        localForm.imageUrl &&
        localForm.description.trim() &&
        !uploading
      );
    };
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'center', position: 'relative' }}>
            <TouchableOpacity onPress={onCancel} style={{ position: 'absolute', left: 20 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color="#222" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 }}>스터디 만들기</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isFormValid()}
              style={{ position: 'absolute', right: 8, padding: 6, opacity: isFormValid() ? 1 : 0.4 }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>생성</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={styles.formGroup}>
              {/* <Text style={styles.createFormLabel}>대표 이미지 (필수)</Text> */}
              <TouchableOpacity onPress={pickImage} style={{ ...styles.createFormInput, alignItems: 'center', justifyContent: 'center', height: 140, width: 140, alignSelf: 'center' }}>
                {localForm.imageUrl ? (
                  <Image source={{ uri: localForm.imageUrl }} style={{ width: 140, height: 140, borderRadius: 16 }} />
                ) : (
                  <Text style={{ color: '#888' }}>이미지 선택</Text>
                )}
              </TouchableOpacity>
              {uploading && <Text style={{ color: '#4CAF50', marginTop: 4 }}>업로드 중...</Text>}
            </View>
            <View style={styles.formGroup}>
              <TextInput
                style={styles.createFormInput}
                placeholder="스터디 이름 (필수)"
                value={localForm.name}
                onChangeText={(text) => setLocalForm({...localForm, name: text})}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.createFormInput, styles.createTextArea]}
                placeholder="방 소개를 입력하세요 (필수)"
                value={localForm.description}
                onChangeText={(text) => setLocalForm({...localForm, description: text})}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.createFormLabel}>해시태그 (선택)</Text>
              <TextInput
                style={styles.createFormInput}
                placeholder="예: 자바 스프링 백엔드 (공백 또는 쉼표로 구분)"
                value={hashtagInput}
                onChangeText={(text) => {
                  setHashtagInput(text);
                  
                  // 쉼표나 공백이 입력되면 자동으로 태그 분리
                  const lastChar = text[text.length - 1];
                  if (lastChar === ',' || lastChar === ' ') {
                    // # 제거하고 공백/쉼표로 분리
                    const tags = text
                      .replace(/#/g, '')
                      .split(/[\s,]+/)
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    
                    // 쉼표로 구분된 문자열로 저장
                    const processedText = tags.join(',');
                    setLocalForm({ ...localForm, hashtags: processedText });
                    
                    // 입력 필드 초기화 (새 태그 입력 준비)
                    setHashtagInput('');
                  }
                }}
                onBlur={() => {
                  // 입력 완료 시 남은 텍스트도 태그로 추가
                  if (hashtagInput.trim()) {
                    const tags = localForm.hashtags ? localForm.hashtags.split(',') : [];
                    const newTag = hashtagInput.replace(/#/g, '').trim();
                    if (newTag && !tags.includes(newTag)) {
                      tags.push(newTag);
                      setLocalForm({ ...localForm, hashtags: tags.join(',') });
                    }
                    setHashtagInput('');
                  }
                }}
                placeholderTextColor="#999"
              />
              {localForm.hashtags && localForm.hashtags.split(',').filter(tag => tag.trim()).length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
                  {localForm.hashtags.split(',').filter(tag => tag.trim()).map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        // 태그 클릭 시 삭제
                        const tags = localForm.hashtags.split(',').filter(t => t.trim() !== tag.trim());
                        setLocalForm({ ...localForm, hashtags: tags.join(',') });
                      }}
                      style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 6, marginBottom: 6 }}
                    >
                      <Text style={{ color: '#1976D2', fontSize: 12 }}>#{tag.trim()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.createFormLabel}>지역 (선택)</Text>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowCityPicker(true)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: selectedCity ? '#111827' : '#E5E7EB',
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: '#fff',
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: selectedCity ? '#111827' : '#9CA3AF', fontSize: 16 }}>
                    {selectedCity || '시/도 선택'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => selectedCity && setShowDistrictPicker(true)}
                  disabled={!selectedCity}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: selectedDistrict ? '#111827' : '#E5E7EB',
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: selectedCity ? '#fff' : '#F9FAFB',
                  }}
                >
                  <Text style={{ color: selectedDistrict ? '#111827' : '#9CA3AF', fontSize: 16 }}>
                    {selectedDistrict || '구/군 선택'}
                  </Text>
                </TouchableOpacity>
              </View>
              {localForm.region && (
                <Text style={{ fontSize: 12, color: '#10B981' }}>
                  ✓ 선택된 지역: {localForm.region}
                </Text>
              )}
            </View>
            <View style={styles.createFormRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.createFormLabel}>카테고리</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={styles.categoryText}>
                    {categoryList.find(cat => cat.id === localForm.category)?.name || '카테고리 선택'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.createFormLabel}>모집 인원</Text>
                <View style={styles.createPeopleCountWrapper}>
                  <TextInput
                    style={styles.createPeopleCountInput}
                    placeholder="0"
                    value={localForm.peopleCount}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setLocalForm({...localForm, peopleCount: numericValue});
                    }}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.createPeopleCountLabel}>명</Text>
                </View>
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.createFormLabel}>비밀번호 (선택)</Text>
              <TextInput
                style={styles.createFormInput}
                placeholder="비밀번호를 입력하세요"
                value={localForm.password}
                onChangeText={(text) => setLocalForm({ ...localForm, password: text })}
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>
          <View style={styles.createModalFooter}>
           
          </View>
        </SafeAreaView>

        {/* 시/도 선택 모달 */}
        <Modal
          visible={showCityPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCityPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCityPicker(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700' }}>시/도 선택</Text>
                    <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                      <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>완료</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {Object.keys(REGIONS).map((city) => (
                      <TouchableOpacity
                        key={city}
                        onPress={() => {
                          setSelectedCity(city);
                          setSelectedDistrict('');
                          setLocalForm(prev => ({ ...prev, region: '' }));
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
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 구/군 선택 모달 */}
        <Modal
          visible={showDistrictPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDistrictPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDistrictPicker(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
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
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 카테고리 선택 모달 */}
        <Modal
          visible={showCategoryPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCategoryPicker(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700' }}>카테고리 선택</Text>
                    <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                      <Text style={{ fontSize: 16, color: '#111827', fontWeight: '600' }}>완료</Text>
                    </TouchableOpacity>
                  </View>
                  {categoryList.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#999', fontSize: 14 }}>카테고리 목록을 불러오는 중...</Text>
                    </View>
                  ) : (
                    <ScrollView>
                      {categoryList.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => {
                            setLocalForm({ ...localForm, category: cat.id });
                            setShowCategoryPicker(false);
                          }}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#E5E7EB',
                          }}
                        >
                          <Text style={{ fontSize: 16, color: localForm.category === cat.id ? '#111827' : '#374151', fontWeight: localForm.category === cat.id ? '700' : '400' }}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    );
  };

  // 참여 모달 상태
  const [joinModal, setJoinModal] = useState({ visible: false, study: null, password: '' });
  const [joinLoading, setJoinLoading] = useState(false);
  const handleJoinRoom = async () => {
    if (!joinModal.study) return;
    setJoinLoading(true);
    try {
      // 비밀번호가 있으면 체크
      if (joinModal.study.password) {
        if (!joinModal.password) {
          alert('비밀번호를 입력하세요.');
          setJoinLoading(false);
          return;
        }
        if (joinModal.password !== joinModal.study.password) {
          alert('비밀번호가 일치하지 않습니다.');
          setJoinLoading(false);
          return;
        }
      }
      // 참여 API 호출 (이미 참여자면 중복 방지)
      await axios.post(`${BASE_URL}/api/study/rooms/join`, {
        studyRoomId: joinModal.study.id,
        userId: null, // Long ID가 아니므로 null
        userEmail: userInfo.email, // 이메일로 사용자 찾기
        userName: userInfo.name, // 사용자 이름 (사용자 생성 시 사용)
      });
      setJoinModal({ visible: false, study: null, password: '' });
      setActiveScreen('chat');
      setActiveChat({ chatRoomId: joinModal.study.chatId, studyName: joinModal.study.name, imageUrl: joinModal.study.imageUrl, studyRoomId: joinModal.study.id, studyRoomHostId: joinModal.study.studyRoomHostId });
      fetchStudyList();
    } catch (err) {
        alert('참여 실패: ' + (err.response?.data?.message || err.message));
    }
    setJoinLoading(false);
  };

  // 참여중인 채팅방 목록 화면
  const ChatListScreen = () => {
    const [chatRooms, setChatRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchChatRooms = async () => {
      try {
        if (!userInfo?.email) return;
        
        // 이메일로 사용자의 스터디룸 조회
        const encodedEmail = encodeURIComponent(userInfo.email);
        const res = await axios.get(`${BASE_URL}/api/study/user/email/${encodedEmail}/rooms`);
        const rooms = Array.isArray(res.data) ? res.data : [];
        
        // 각 채팅방의 마지막 메시지 fetch 및 id 보완
        const roomsWithLastMsg = await Promise.all(
          rooms.filter(r => r.chatId).map(async (room: any) => {
            let lastMsg = null;
            let studyRoomId = room.id;
            try {
              const msgRes = await axios.get(`${BASE_URL}/api/chat/rooms/${room.chatId}/all`);
              const msgs = Array.isArray(msgRes.data) ? msgRes.data : [];
              lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            } catch {}
            // id가 없으면 chatId로 스터디방 id 조회
            if (!studyRoomId && room.chatId) {
              try {
                const studyRes = await axios.get(`${BASE_URL}/api/study/chat/${room.chatId}`);
                studyRoomId = studyRes.data.id;
              } catch {}
            }
            return { ...room, lastMsg, id: studyRoomId };
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
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    useEffect(() => {
      if (userInfo) {
        setLoading(true);
        fetchChatRooms();
      }
    }, [userInfo]);

    const onRefresh = () => {
      setRefreshing(true);
      fetchChatRooms();
    };

    // 방 나가기 함수 (채팅 리스트용)
    const leaveRoomFromList = (room: any) => {
      if (!room.id) {
        alert('스터디방 id가 없습니다. 방 나가기 기능이 동작하지 않습니다.');
        return;
      }
      
      // 방장 여부 확인
      const hostId = String(room.studyRoomHostId || '');
      const userId = String(userInfo?.id || userInfo?.uuid || '');
      const isHost = hostId && userId && hostId === userId;
      
      if (isHost) {
        // 방장인 경우 스터디룸 삭제 확인
        Alert.alert(
          '스터디룸 삭제',
          '방장이 나가면 스터디룸이 완전히 삭제됩니다. 정말로 나가시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: async () => {
                try {
                  // 시스템 메시지 전송 (삭제 전에 먼저 전송)
                  try {
                    await axios.post(`${BASE_URL}/api/chat/send`, {
                      chatRoomId: room.chatId,
                      userId: userInfo.id,
                      sender: '시스템',
                      content: '스터디룸이 삭제되었습니다.',
                    });
                  } catch (msgErr) {
                    console.error('시스템 메시지 전송 실패:', msgErr);
                  }
                  
                  // 스터디룸 삭제 API 호출
                  await axios.delete(`${BASE_URL}/api/study/rooms/${room.id}`);
                  
                  // 채팅방 목록에서 제거
                  setChatRooms(prev => prev.filter(r => r.chatId !== room.chatId));
                  
                  // 스터디룸 목록 새로고침
                  setTimeout(() => {
                    fetchStudyList();
                  }, 500); // 약간의 지연을 두어 삭제가 완료된 후 새로고침
                  
                } catch (err) {
                  console.error('스터디룸 삭제 에러:', err);
                  alert('스터디룸 삭제 실패: ' + (err.response?.data?.message || err.message));
                }
              }
            }
          ]
        );
      } else {
        // 일반 사용자인 경우 기존 로직
        Alert.alert(
          '방 나가기',
          '정말로 이 방에서 퇴장하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '확인',
              style: 'destructive',
              onPress: async () => {
                try {
                  await axios.delete(`${BASE_URL}/api/study/${room.id}/${userInfo.id}`);
                  setChatRooms(prev => prev.filter(r => r.chatId !== room.chatId));
                } catch (err) {
                  alert('방 퇴장 실패: ' + (err.response?.data?.message || err.message));
                }
              }
            }
          ]
        );
      }
    };

    // Swipeable의 오른쪽 액션 렌더러
    const renderRightActions = (room) => (
      <TouchableOpacity
        style={{ backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', width: 100, height: '100%' }}
        onPress={() => leaveRoomFromList(room)}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>방 나가기</Text>
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
            onPress={() => setActiveScreen('list')}
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
            keyExtractor={(item) => String(item.chatId || item.id)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 }}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" style={{ marginBottom: 16 }} />
                <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                  참여 중인 채팅방이 없습니다
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
                  스터디에 참여하면 채팅방이 여기에 표시됩니다
                </Text>
              </View>
            }
            renderItem={({ item: room }) => (
              <Swipeable
                key={room.chatId}
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
                    if (!room.chatId) {
                      Alert.alert('채팅방 진입 불가', '이 방에는 chatId가 없습니다.');
                      return;
                    }
                    setChatEntrySource('chat-list');
                    setActiveChat({ 
                      chatRoomId: room.chatId, 
                      studyName: room.name, 
                      imageUrl: room.imageUrl, 
                      studyRoomId: room.id, 
                      studyRoomHostId: room.studyRoomHostId || null
                    });
                    setActiveScreen('chat');
                  }}
                >
                  {/* 이미지 */}
                  {room.imageUrl ? (
                    <Image 
                      source={{ uri: room.imageUrl }} 
                      style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 12, 
                        marginRight: 14,
                        backgroundColor: '#E5E7EB'
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 12, 
                      marginRight: 14, 
                      backgroundColor: '#E5E7EB', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Ionicons name="book-outline" size={28} color="#9CA3AF" />
                    </View>
                  )}
                  
                  {/* 내용 */}
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 }} numberOfLines={1}>
                        {room.name}
                      </Text>
                      {(() => {
                        // 방장 여부 확인
                        const hostId = String(room.studyRoomHostId || '');
                        const userId = String(userInfo?.id || userInfo?.uuid || '');
                        return hostId && userId && hostId === userId;
                      })() && (
                        <View style={{ 
                          backgroundColor: '#FEF3C7', 
                          paddingHorizontal: 6, 
                          paddingVertical: 2, 
                          borderRadius: 4, 
                          marginLeft: 6 
                        }}>
                          <Text style={{ fontSize: 9, color: '#92400E', fontWeight: '600' }}>방장</Text>
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

  // 1. 상단에 상태 추가
  const [chatEntrySource, setChatEntrySource] = useState(''); // 'study' | 'chat-list'


  // 현재 채팅방의 studyRoomHostId를 구하는 함수
  const getCurrentRoomHostId = () => {
    // activeChat에서 직접 studyRoomHostId를 가져오거나, studyList에서 찾기
    if (activeChat.studyRoomHostId) {
      return activeChat.studyRoomHostId;
    }
    const room = Array.isArray(studyList) ? studyList.find(r => r.chatId === activeChat.chatRoomId) : null;
    return room ? room.studyRoomHostId : null;
  };
  const isHost = userInfo && getCurrentRoomHostId() === userInfo.id;

  const increasePostViews = async (postId) => {
    try {
      await axios.patch(`${BASE_URL}/api/community/${postId}/views`);
    } catch {}
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
        <SearchModal 
          visible={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSearch={setFilteredStudyData}
          studyList={studyList}
          styles={styles}
        />
        <ScheduleModal
          visible={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          meetingList={meetingList}
          styles={styles}
        />
        
        {/* 카테고리 선택 모달 (StudyApp 최상위 레벨) */}
        <Modal
          transparent={true}
          visible={showCategoryPicker}
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} 
            activeOpacity={1} 
            onPress={() => setShowCategoryPicker(false)}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, minWidth: 280, maxHeight: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>카테고리 선택</Text>
                  <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                    <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                {categoryList.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#999', fontSize: 14 }}>카테고리 목록을 불러오는 중...</Text>
                    <TouchableOpacity 
                      style={{ marginTop: 12, padding: 8, backgroundColor: '#4CAF50', borderRadius: 8 }}
                      onPress={async () => {
                        await fetchCategoryList();
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14 }}>다시 시도</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                    {categoryList.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                        onPress={() => {
                          console.log('카테고리 선택:', cat.id, cat.name);
                          const newForm = {...studyFormRef.current, category: cat.id};
                          studyFormRef.current = newForm;
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={{ fontSize: 15, color: studyFormRef.current.category === cat.id ? '#4CAF50' : '#333', fontWeight: studyFormRef.current.category === cat.id ? 'bold' : 'normal' }}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {showMenuDrawer && (
          <>
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 }}
              activeOpacity={1}
              onPress={closeMenuDrawer}
            />
            <Animated.View
              style={{
                position: 'absolute',
                top: insets.top,
                right: 0,
                width: Dimensions.get('window').width * 0.75,
                height: Dimensions.get('window').height - insets.top,
                backgroundColor: '#fff',
                zIndex: 20,
                padding: 0,
                shadowColor: '#000',
                shadowOffset: { width: -2, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 8,
                transform: [{ translateX: menuAnim }],
              }}
            >
              {/* 상단: 채팅방 썸네일, 제목, 대화상태 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 24 }}>
                {activeChat.imageUrl ? (
                  <Image source={{ uri: activeChat.imageUrl }} style={{ width: 56, height: 56, borderRadius: 16, marginRight: 16, backgroundColor: '#eee' }} />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 16, marginRight: 16, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28, color: '#bbb' }}>📷</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }} numberOfLines={1}>{activeChat.studyName}</Text>
                </View>
                <TouchableOpacity onPress={closeMenuDrawer} style={{ marginLeft: 8, padding: 4 }}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>
              {/* 참여자 리스트 (2열 그리드) */}
              <View style={{
                borderWidth: 1,
                borderColor: '#eee',
                borderRadius: 14,
                backgroundColor: '#fff',
                overflow: 'hidden',
                paddingHorizontal: 0,
                marginHorizontal: 24,
                marginBottom: 18,
                paddingTop: 10,
                paddingBottom: 10,
                maxHeight: 220,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '500', marginBottom: 10, color: '#222', marginLeft: 18 }}>대화상대</Text>
                {participantsLoading ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', height: 60 }}><Text>로딩 중...</Text></View>
                ) : participants.length === 0 ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', height: 60 }}><Text>참여자가 없습니다</Text></View>
                ) : (
                  <FlatList
                    data={participants}
                    keyExtractor={item => String(item.userId)}
                    numColumns={1}
                    contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 6 }}
                    renderItem={({ item }) => (
                      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', marginVertical: 6, marginHorizontal: 8, padding: 12, borderRadius: 10 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="person" size={22} color="#bbb" />
                        </View>
                        <Text style={{ fontSize: 13, color: '#222', marginLeft: 14 }}>{item.name}</Text>
                        {/* 방장만 내보내기 버튼 보임 (본인은 안 보임) */}
                        {isHost && item.userId !== userInfo.id && (
                          <TouchableOpacity
                            onPress={async () => {
                              try {
                                // activeChat에서 직접 studyRoomId 가져오기
                                const studyRoomId = activeChat.studyRoomId;
                                
                                if (!studyRoomId) {
                                  alert('스터디룸 정보를 찾을 수 없습니다.');
                                  return;
                                }

                                // 사용자 확인
                                if (!item.userId) {
                                  alert('사용자 정보를 찾을 수 없습니다.');
                                  return;
                                }

                                // 확인 대화상자
                                const confirmResult = await new Promise((resolve) => {
                                  Alert.alert(
                                    '사용자 내보내기',
                                    `${item.name}님을 스터디룸에서 내보내시겠습니까?`,
                                    [
                                      { text: '취소', onPress: () => resolve(false) },
                                      { text: '내보내기', onPress: () => resolve(true), style: 'destructive' }
                                    ]
                                  );
                                });

                                if (!confirmResult) return;
                                
                                console.log(`내보내기 요청: studyRoomId=${studyRoomId}, userId=${item.userId}`);
                                console.log('activeChat 정보:', activeChat);
                                console.log('참여자 정보:', item);
                                
                                await axios.delete(`${BASE_URL}/api/study/${studyRoomId}/${item.userId}`);
                                
                                // 시스템 메시지 전송: "OOO님이 내보내졌습니다."
                                try {
                                  await axios.post(`${BASE_URL}/api/chat/send`, {
                                    chatRoomId: activeChat.chatRoomId,
                                    userId: userInfo.id,
                                    sender: '시스템',
                                    content: `${item.name}님이 내보내졌습니다.`,
                                  });
                                } catch (msgErr) {
                                  console.error('시스템 메시지 전송 실패:', msgErr);
                                }
                                
                                // 퇴출 후 참여자 목록 새로고침
                                openMenuDrawer();
                              } catch (err) {
                                console.error('내보내기 오류:', err);
                                const errorMessage = err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.';
                                alert('내보내기 실패: ' + errorMessage);
                              }
                            }}
                            style={{ marginLeft: 10 }}
                          >
                            <Text style={{ color: '#FF5252', fontSize: 13 }}>내보내기</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
              {/* 일정/방 퇴장 버튼 그룹 */}
              <View style={{
                position: 'absolute',
                left: 24,
                right: 24,
                bottom: 24,
                borderWidth: 1,
                borderColor: '#eee',
                borderRadius: 14,
                backgroundColor: '#fff',
                overflow: 'hidden',
              }}>
                {isHost && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                      borderRadius: 0,
                      alignItems: 'center',
                      paddingVertical: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                    onPress={() => setShowMeetingModal(true)}
                  >
                    <Text style={{ color: '#222', fontWeight: 'normal', fontSize: 15 }}>일정 생성</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: 0,
                    alignItems: 'center',
                    paddingVertical: 16,
                  }}
                  onPress={handleLeaveRoom}
                >
                  <Text style={{ color: '#FF5252', fontWeight: 'normal', fontSize: 16 }}>채팅방 나가기</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}
        <ChatListModal />
        <Modal
          transparent
          visible={joinModal.visible}
          animationType="fade"
          onRequestClose={() => setJoinModal({ visible: false, study: null, password: '' })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.centerModalContent, { width: '85%', maxWidth: 350, padding: 24 }]}> 
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>방에 참여하시겠습니까?</Text>
              {/* 썸네일 */}
              {joinModal.study?.imageUrl ? (
                <Image source={{ uri: joinModal.study.imageUrl }} style={{ width: 60, height: 60, borderRadius: 12, alignSelf: 'center', marginBottom: 12 }} />
              ) : (
                <View style={{ width: 60, height: 60, borderRadius: 12, alignSelf: 'center', marginBottom: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 30, color: '#ccc' }}>📚</Text>
                </View>
              )}
              {/* 제목 */}
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 6 }} numberOfLines={1} ellipsizeMode="tail">
                {joinModal.study?.name ?? ''}
              </Text>
              {/* 소개 */}
              {joinModal.study?.description ? (
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' }} numberOfLines={2} ellipsizeMode="tail">
                  {joinModal.study.description}
                </Text>
              ) : null}
              {/* 인원수, 방장명 */}
              <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 14 }}>
                인원수: {participantCounts[joinModal.study?.id] ?? '-'} / {joinModal.study?.peopleCount ?? '-'}명  |  방장: {joinModal.study?.hostName ?? '스터디 방장'}
              </Text>
              {joinModal.study?.password ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 6 }}>비밀번호</Text>
                  <TextInput
                    style={[styles.createFormInput, { marginBottom: 0 }]}
                    placeholder="비밀번호를 입력하세요"
                    value={joinModal.password}
                    onChangeText={pw => setJoinModal(j => ({ ...j, password: pw }))}
                    secureTextEntry
                    placeholderTextColor="#999"
                  />
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', marginTop: 32 }}>
                <TouchableOpacity
                  style={[styles.createSubmitButton, { backgroundColor: '#ccc', flex: 1, marginHorizontal: 4 }]}
                  onPress={() => setJoinModal({ visible: false, study: null, password: '' })}
                  disabled={joinLoading}
                >
                  <Text style={styles.createSubmitButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createSubmitButton, { flex: 1, marginHorizontal: 4, backgroundColor: joinLoading ? '#ccc' : '#000' }]}
                  onPress={handleJoinRoom}
                  disabled={joinLoading}
                >
                  <Text style={styles.createSubmitButtonText}>{joinLoading ? '참여 중...' : '참여'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};


export default StudyApp;
