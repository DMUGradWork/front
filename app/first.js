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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/styles/hljs';

const StudyApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [participantCounts, setParticipantCounts] = useState({});
  const [activeScreen, setActiveScreen] = useState('list'); // 'list', 'chat', 'community'
  const [activeChat, setActiveChat] = useState({ chatRoomId: null, studyName: '', studyRoomId: null, studyRoomHostId: null });
  // 자동 로그인/자동 userId:1 fetch 관련 코드 제거
  // 앱 시작 시 무조건 로그인 화면이 뜨도록 함
  // SplashScreen 추가 및 이동 버튼 누르면 로그인 화면으로 이동
  // SplashScreen 및 showSplash 관련 코드 완전히 제거

  // 1. 더미 데이터 및 관련 state 삭제
  // const initialStudyData = [...];
  // const [studyList, setStudyList] = useState(initialStudyData);
  // const [filteredStudyData, setFilteredStudyData] = useState(initialStudyData);
  const [studyList, setStudyList] = useState([]);
  const [filteredStudyData, setFilteredStudyData] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [meetingList, setMeetingList] = useState([]); // 실제 DB 일정 리스트

  // 스터디 생성 폼 상태를 useRef로 변경
  // studyFormRef의 category는 id로 저장하도록 변경
  const studyFormRef = useRef({
    name: '',
    category: '', // categoryId로 사용
    peopleCount: '',
    imageUrl: '',
    description: '',
  });

  // 검색 관련 상태를 ref로 변경 (type 고정)
  const searchRef = useRef({
    type: 'title',
    text: ''
  });

  // 로컬 IP 자동 감지 (Expo 환경용)
  const getLocalIP = async () => {
    try {
      // Expo 환경에서 로컬 IP 감지
      const { getIpAddressAsync } = require('expo-network');
      const ip = await getIpAddressAsync();
      return ip || '192.168.0.41'; // fallback IP
    } catch (error) {
      console.log('IP 감지 실패, 기본 IP 사용:', error);
      return '192.168.0.41'; // fallback IP
    }
  };

  const [BASE_URL, setBASE_URL] = useState('http://192.168.0.41:8080');

  // 컴포넌트 마운트 시 로컬 IP 설정
  useEffect(() => {
    const setLocalIP = async () => {
      const localIP = await getLocalIP();
      setBASE_URL(`http://${localIP}:8080`);
      console.log('로컬 IP 설정됨:', localIP);
    };
    setLocalIP();
  }, []);

  // 2. 목록/카테고리 fetch 함수 추가
  const fetchStudyList = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/study`);
      let data = Array.isArray(res.data) ? res.data : [];
      // 각 방의 마지막 메시지 fetch
      data = await Promise.all(
        data.map(async (room) => {
          if (!room.chatId) return room;
          try {
            const msgRes = await axios.get(`${BASE_URL}/api/chat/rooms/${room.chatId}/all`);
            const msgs = Array.isArray(msgRes.data) ? msgRes.data : [];
            return { ...room, lastMsg: msgs.length > 0 ? msgs[msgs.length - 1] : null };
          } catch {
            return { ...room, lastMsg: null };
          }
        })
      );
      setStudyList(data);
      setFilteredStudyData(data);
      fetchAllParticipantCounts(data); // 참여자 수 동기화
      // 일정 fetch
      fetchAllMeetings(data);
    } catch (err) {
      setStudyList([]);
      setFilteredStudyData([]);
      setParticipantCounts({});
      setMeetingList([]);
    }
  };
  const fetchCategoryList = async () => {
    try {
      console.log('카테고리 목록을 가져오는 중...');
      const res = await axios.get(`${BASE_URL}/api/study/category`);
      console.log('카테고리 목록 응답:', res.data);
      setCategoryList(res.data || []);
    } catch (err) {
      console.error('카테고리 목록 가져오기 실패:', err);
      setCategoryList([]);
    }
  };

  // 스터디방 참여자 수를 모두 fetch
  const fetchAllParticipantCounts = async (studyRooms) => {
    const counts = {};
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

  // 일정 fetch 함수
  const fetchAllMeetings = async (studyRooms) => {
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
  }, []);

  // 연속 출석 자동 체크: 오늘 날짜와 마지막 출석 날짜가 다르면 출석체크 API 호출
  useEffect(() => {
    // 자동 로그인/자동 userId:1 fetch 관련 코드 제거
    // 앱 시작 시 무조건 로그인 화면이 뜨도록 함
    // SplashScreen 추가 및 이동 버튼 누르면 로그인 화면으로 이동
    // 자동 로그인 관련 useEffect, fetchUserInfo 등도 제거한다.
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

  const closeModal = () => {
    setShowScheduleModal(false);
  };

  const scheduleData = [
    {
      id: 1,
      title: '김영한의 스프링 스터디',
      time: '18:00',
      date: '오늘',
    },
    {
      id: 2,
      title: '모던 자바스크립트 스터디',
      time: '19:30',
      date: '오늘',
    },
    {
      id: 3,
      title: 'React Native 실전 스터디',
      time: '20:00',
      date: '내일',
    },
    {
      id: 4,
      title: '알고리즘 문제풀이 스터디',
      time: '14:00',
      date: '내일',
    }
  ];

  const ScheduleModal = () => (
    <Modal
      transparent={true}
      visible={showScheduleModal}
      onRequestClose={closeModal}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.centerModalContent, styles.scheduleModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>스터디 일정</Text>
            <TouchableOpacity 
              style={styles.closeButtonContainer}
              onPress={closeModal}
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

  // 출석 잔디(Grass) 컴포넌트
  const AttendanceGrass = ({ lastAttendanceDate, consecutiveAttendance }) => {
    const [selected, setSelected] = React.useState(null); 
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const translateYAnim = React.useRef(new Animated.Value(0)).current;
    // 49일(7주) 기준, 오늘을 기준으로 연속 출석일만큼 잔디 표시
    const attendanceArray = Array(49).fill(false);
    const dateArray = Array(49).fill(null); // 각 칸의 날짜 저장
    if (lastAttendanceDate && consecutiveAttendance) {
      let lastDate = new Date(lastAttendanceDate);
      const today = new Date();
      let offset = 0;
      if (
        lastDate.getFullYear() === today.getFullYear() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getDate() === today.getDate()
      ) {
        offset = 0;
      } else {
        offset = 1;
      }
      for (let i = 0; i < Math.min(consecutiveAttendance, 49 - offset); i++) {
        const idx = 48 - i - offset;
        if (idx >= 0) {
          attendanceArray[idx] = true;
          // 날짜 계산: 마지막 출석일에서 -i만큼
          const d = new Date(lastDate);
          d.setDate(lastDate.getDate() - (consecutiveAttendance - 1 - i));
          dateArray[idx] = new Date(d);
        }
      }
      if (offset === 0) {
        attendanceArray[48] = true;
        dateArray[48] = new Date(lastDate);
      }
    }
    // 7x7 그리드로 렌더링 (크기 40x40, borderRadius 12)
    const handleGrassPress = (row, col, dateObj) => {
      setSelected({ row, col, date: dateObj });
      scaleAnim.setValue(0.7);
      translateYAnim.setValue(10);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateYAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
    };

    return (
      <TouchableWithoutFeedback onPress={() => setSelected(null)}>
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>최근 7주 출석 현황</Text>
          <View style={{ flexDirection: 'row', position: 'relative', minHeight: 320 }}>
            {[...Array(7)].map((_, col) => (
              <View key={col} style={{ flexDirection: 'column', marginHorizontal: 2 }}>
                {[...Array(7)].map((_, row) => {
                  const idx = col * 7 + row;
                  const isAttended = attendanceArray[idx];
                  const dateObj = dateArray[idx];
                  const isSelected = selected && selected.row === row && selected.col === col;
                  if (isAttended) {
                    return (
                      <View key={row} style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                        {/* 말풍선 */}
                        {isSelected && dateObj && (
                          <View style={{
                            position: 'absolute',
                            bottom: 48,
                            left: '50%',
                            transform: [{ translateX: -60 }],
                            minWidth: 80,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            backgroundColor: '#fff',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#D0D0D0',
                            shadowColor: '#000',
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                            alignItems: 'center',
                            zIndex: 10,
                          }}>
                            <Text style={{ fontSize: 11, color: '#333' }}>
                              {`${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 `}
                              {dateObj.getHours().toString().padStart(2, '0')}
                              :{dateObj.getMinutes().toString().padStart(2, '0')}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={e => {
                            e.stopPropagation();
                            handleGrassPress(row, col, dateObj);
                          }}
                          style={{ alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSelected ? (
                            <Animated.View
                              style={{
                                width: 40,
                                height: 40,
                                margin: 2,
                                borderRadius: 12,
                                backgroundColor: '#A8E6A3',
                                borderWidth: 1,
                                borderColor: '#D0D0D0',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: [
                                  { scale: scaleAnim },
                                  { translateY: translateYAnim },
                                ],
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                margin: 2,
                                borderRadius: 12,
                                backgroundColor: '#A8E6A3',
                                borderWidth: 1,
                                borderColor: '#D0D0D0',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  } else {
                    return (
                      <View
                        key={row}
                        style={{
                          width: 40,
                          height: 40,
                          margin: 2,
                          borderRadius: 12,
                          backgroundColor: '#E0E0E0',
                          borderWidth: 1,
                          borderColor: '#D0D0D0',
                        }}
                      />
                    );
                  }
                })}
              </View>
            ))}
          </View>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            오늘 기준, 최근 49일간의 출석을 표시합니다.
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const DashboardScreen = () => {
    const today = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const dayOfWeek = days[today.getDay()];

    // 가장 가까운 일정 1개만 표시 (없으면 메시지)
    const nextMeeting = meetingList.length > 0 ? meetingList[0] : null;

    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.subtitle}>{dayOfWeek}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>연속 출석</Text>
              <Text style={styles.statValue}>
                {userInfo ? userInfo.consecutiveAttendance : '-'}일
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>스터디 일정</Text>
              <Text style={styles.statValue}>{meetingList.length}개</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>참여중인 방</Text>
              <Text style={styles.statValue}>
                {userInfo ? userInfo.roomCount : '-'}개
              </Text>
            </View>
          </View>
          {/* 출석 잔디 UI */}
          <AttendanceGrass lastAttendanceDate={userInfo?.lastAttendanceDate} consecutiveAttendance={userInfo?.consecutiveAttendance} />
          {/* 일정 카드 (스크롤 없이 항상 보이게) */}
          <View style={styles.bottomContent}>
            <View style={styles.welcomeCard}>
              {nextMeeting ? (
                <>
                  <Text style={styles.welcomeTitle}>{nextMeeting.title}</Text>
                  <TouchableOpacity onPress={() => setShowScheduleModal(true)}>
                    <Text style={styles.welcomeSubtitle}>일정 모아보기</Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <View style={styles.scheduleRow}>
                    <Text style={styles.scheduleText}>{nextMeeting.studyRoomName || ''}</Text>
                    <Text style={styles.scheduleText1}>{nextMeeting.meetingTime ? nextMeeting.meetingTime.slice(11, 16) : ''}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.welcomeTitle}>예정된 일정이 없습니다.</Text>
              )}
            </View>
          </View>
          <ScheduleModal />
        </View>
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

  // 4. 스터디 생성 핸들러 수정
  const handleCreateStudy = async () => {
    const formData = studyFormRef.current;
    if (!formData.name.trim()) {
      alert('스터디명을 입력해주세요.');
      return;
    }
    if (!formData.category) {
      alert('카테고리를 선택해주세요.');
      return;
    }
    if (!formData.peopleCount) {
      alert('모집 인원을 입력해주세요.');
      return;
    }
    if (!formData.imageUrl) {
      alert('대표 이미지는 필수입니다.');
      return;
    }
    // category는 이제 id임
    const categoriesId = formData.category;
    // StudyRoomDTO 생성
    const newRoom = {
      name: formData.name,
      studyRoomHostId: 1, // 임시로 1번 유저
      categoriesId: categoriesId,
      peopleCount: parseInt(formData.peopleCount, 10),
      password: formData.password, // 추가
      imageUrl: formData.imageUrl, // 추가
      description: formData.description,
    };
    try {
      await axios.post(`${BASE_URL}/api/study`, newRoom);
      setShowCreateModal(false);
      studyFormRef.current = { name: '', category: '', peopleCount: '', password: '', imageUrl: '', description: '' };
      fetchStudyList(); // 생성 후 목록 새로고침
    } catch (err) {
      alert('스터디룸 생성 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  const SearchModal = () => {
    const [localSearch, setLocalSearch] = useState({ type: 'title', text: '' });

    const handleLocalSearch = () => {
      if (!localSearch.text.trim()) {
        setFilteredStudyData(studyList);
        setShowSearchModal(false);
        return;
      }

      const searchQuery = localSearch.text.toLowerCase().trim();
      const filtered = (Array.isArray(studyList) ? studyList : []).filter(study => {
        if (localSearch.type === 'title') {
          return study?.name && study.name.toLowerCase().includes(searchQuery);
        } else {
          return study?.hostName && study.hostName.toLowerCase().includes(searchQuery); // hostName으로 변경
        }
      });

      setFilteredStudyData(filtered);
      setShowSearchModal(false);
    };

    return (
      <Modal
        transparent={true}
        visible={showSearchModal}
        onRequestClose={() => {
          setShowSearchModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.centerModalContent, styles.searchModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>스터디방 검색</Text>
              <TouchableOpacity 
                style={styles.closeButtonContainer}
                onPress={() => setShowSearchModal(false)}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={localSearch.type === 'title' ? "스터디방 제목을 입력하세요" : "방장 이름을 입력하세요"}
                  value={localSearch.text}
                  onChangeText={(text) => setLocalSearch({...localSearch, text})}
                  returnKeyType="search"
                  onSubmitEditing={handleLocalSearch}
                />
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={handleLocalSearch}
                >
                  <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // CreateModal에서 카테고리 선택 UI를 categoryList 기반으로, value는 id로, label은 name으로 표시
  const CreateModal = () => {
    const [localForm, setLocalForm] = useState({
      ...studyFormRef.current,
      category: studyFormRef.current.category || (categoryList[0]?.id || ''),
      imageUrl: studyFormRef.current.imageUrl || '',
      description: studyFormRef.current.description || '',
    });
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [imageUri, setImageUri] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
      studyFormRef.current = localForm;
    }, [localForm]);

    const pickImage = async () => {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('이미지 접근 권한이 필요합니다.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // 수정됨
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // 업로드 용량 최소화
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
        studyFormRef.current.imageUrl = res.data.url;
      } catch (e) {
        alert('이미지 업로드 실패');
      }
      setUploading(false);
    };

    return (
      <Modal
        transparent={true}
        visible={showCreateModal}
        onRequestClose={() => {
          studyFormRef.current = {
            name: '',
            category: categoryList[0]?.id || '',
            peopleCount: '',
            password: '',
            imageUrl: '',
            description: '',
          };
          setShowCreateModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.centerModalContent, styles.createModalContent]}>
              <View style={styles.createModalHeader}>
                <Text style={styles.createModalTitle}>새로운 스터디 만들기</Text>
                <TouchableOpacity 
                  style={styles.createCloseButton}
                  onPress={() => {
                    studyFormRef.current = {
                      name: '',
                      category: categoryList[0]?.id || '',
                      peopleCount: '',
                      password: '',
                      imageUrl: '',
                      description: '',
                    };
                    setShowCreateModal(false);
                  }}
                >
                  <Text style={styles.createCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.createFormContainer}>
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
                  <Text style={styles.createFormLabel}>방 소개</Text>
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
                      <Text style={styles.categoryArrow}>▼</Text>
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
                <TouchableOpacity 
                  style={[styles.createSubmitButton, (!localForm.imageUrl || uploading) && { backgroundColor: '#ccc' }]}
                  onPress={async () => {
                    if (!localForm.imageUrl) {
                      alert('대표 이미지는 필수입니다.');
                      return;
                    }
                    await handleCreateStudy();
                  }}
                  disabled={!localForm.imageUrl || uploading}
                >
                  <Text style={styles.createSubmitButtonText}>스터디 생성하기</Text>
                </TouchableOpacity>
              </View>

              {/* 카테고리 선택 모달 */}
              <Modal
                visible={showCategoryPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCategoryPicker(false)}
              >
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, minWidth: 220 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>카테고리 선택</Text>
                    {categoryList.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={{ paddingVertical: 10, paddingHorizontal: 4 }}
                        onPress={() => {
                          setLocalForm(f => ({ ...f, category: cat.id }));
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={{ fontSize: 15, color: localForm.category === cat.id ? '#222' : '#666', fontWeight: localForm.category === cat.id ? 'bold' : 'normal' }}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
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
      
      const interval = setInterval(() => fetchMessages(true), 2000); // 2초마다 새 메시지만 폴링
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
          userId: userInfo.id,
          sender: userInfo.name,
          content: newMsg.content,
        });
        // 2. 서버에서 실제 메시지 목록 다시 fetch
        await fetchMessages(true);
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

  // 로그인 화면
  const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.post(`${BASE_URL}/api/user/login`, { email, password });
        setUserInfo(res.data);
        // 로그인 성공 시 출석 체크
        try {
          await axios.post(`${BASE_URL}/api/user/${res.data.id}/attendance`);
        } catch (attErr) {
          // 출석 체크 실패 시 무시 (네트워크 문제 등)
        }
      } catch (err) {
        setError('로그인 실패: 이메일 또는 비밀번호를 확인하세요');
      }
      setLoading(false);
    };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={{ width: '80%', padding: 24, borderRadius: 12, backgroundColor: '#f8f8f8', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' }}>로그인</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff' }}
            placeholder="이메일"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#fff' }}
            placeholder="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={{ color: 'red', marginBottom: 12 }}>{error}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: '#4CAF50', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // StudyListScreen 헤더에 로그아웃 버튼 추가
  const StudyListScreen = () => {
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
            Grew<Text style={{ color: '#90EE90' }}>Meet</Text>
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
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                              </View>
                              <View style={{ alignItems: 'flex-end', minWidth: 60, marginTop: 4 }}>
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
          <SearchModal />
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

  // renderScreen에서 SplashScreen 분기 제거, 로그인하지 않으면 무조건 LoginScreen만 보이게
  const renderScreen = () => {
    if (!userInfo) {
      return <LoginScreen />;
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
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'study-list':
        return <StudyListScreen />;
      case 'community':
        return <CommunityScreen />;
      case 'more':
        return <MoreScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  // 연속 참석일에 따른 이미지 선택 함수
  const getAttendanceImage = (days) => {
    if (days >= 91) return require('../assets/images/fw.png');
    if (days >= 61) return require('../assets/images/four-image.png');
    if (days >= 31) return require('../assets/images/third-image.png');
    if (days >= 11) return require('../assets/images/second-image.png');
    return require('../assets/images/first_image.png');
  };

  // 카테고리 라벨 가져오기 함수
  const getCategoryLabel = (value) => {
    const categories = {
      'programming': '📚 프로그래밍 / 개발',
      'design': '🎨 디자인',
      'language': '🌏 외국어',
      'job': '💼 취업 / 이직',
      'data_science': '📊 데이터 사이언스',
      'mobile_dev': '📱 모바일 앱 개발',
      'game_dev': '🎮 게임 개발',
      'security': '🔒 보안 / 네트워크',
      'devops': '☁️ 클라우드 / DevOps',
      'ai_ml': '🤖 AI / 머신러닝',
      'video_editing': '🎥 영상 편집',
      'music': '🎵 음악 / 작곡',
      'writing': '📝 블로그 / 글쓰기',
      'investment': '📈 주식 / 투자',
      'reading': '📚 독서',
      'certification': '✏️ 자격증',
      'interview': '📋 면접 준비',
      'language_test': '📖 어학시험',
      'coding_test': '🎯 코딩테스트',
      'web_dev': '🌐 웹 개발'
    };
    return categories[value] || "카테고리 선택";
  };

  // handleVote 함수 수정: 서버에 투표 저장, 투표 현황/과반수 여부 확인
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

  // 카테고리 필터 바 컴포넌트
  const CategoryFilterBar = ({ categoryList, selectedCategory, onSelectCategory }) => (
    <View style={{ backgroundColor: '#fff', paddingVertical: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 0, marginBottom: 8 }}>
        <TouchableOpacity
          style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonSelected]}
          onPress={() => onSelectCategory('all')}
        >
          <Text style={[styles.categoryButtonText, selectedCategory === 'all' && styles.categoryButtonTextSelected]}>전체</Text>
        </TouchableOpacity>
        {categoryList && categoryList.length > 0 ? (
          categoryList.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonSelected]}
              onPress={() => onSelectCategory(cat.id)}
            >
              <Text style={[styles.categoryButtonText, selectedCategory === cat.id && styles.categoryButtonTextSelected]}>{cat.name}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ padding: 10 }}>
            <Text style={{ color: '#999', fontSize: 14 }}>카테고리 로딩 중...</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    });
    const [imageUri, setImageUri] = useState('');
    const [uploading, setUploading] = useState(false);
    // 카테고리 선택 모달 상태 추가
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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
        studyRoomHostId: userInfo?.id,
        hostName: userInfo?.name,
        categoriesId: localForm.category,
        peopleCount: parseInt(localForm.peopleCount, 10),
        password: localForm.password,
        imageUrl: localForm.imageUrl,
        description: localForm.description,
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
        userId: userInfo.id,
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
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const fetchChatRooms = async () => {
        setLoading(true);
        try {
          // 참여중인 스터디방 목록에서 채팅방 정보와 마지막 메시지 가져오기
          const res = await axios.get(`${BASE_URL}/api/study/${userInfo.id}/rooms`);
          const rooms = Array.isArray(res.data) ? res.data : [];
          // 각 채팅방의 마지막 메시지 fetch 및 id 보완
          const roomsWithLastMsg = await Promise.all(
            rooms.filter(r => r.chatId).map(async (room) => {
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
        } finally {
          setLoading(false);
        }
      };
      fetchChatRooms();
    }, [userInfo]);

    // 방 나가기 함수 (채팅 리스트용)
    const leaveRoomFromList = (room) => {
      if (!room.id) {
        alert('스터디방 id가 없습니다. 방 나가기 기능이 동작하지 않습니다.');
        return;
      }
      
      const isHost = userInfo && room.studyRoomHostId === userInfo.id;
      
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 25, fontWeight: '600' }}>채팅</Text>
        </View>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>로딩 중...</Text></View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {chatRooms.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>참여중인 채팅방이 없습니다</Text>
              </View>
            ) : (
              chatRooms.map(room => (
                <Swipeable
                  key={room.chatId}
                  renderRightActions={() => renderRightActions(room)}
                  overshootRight={false}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' }}
                    onPress={() => {
                      if (!room.chatId) {
                        Alert.alert('채팅방 진입 불가', '이 방에는 chatId가 없습니다.\n' + JSON.stringify(room, null, 2));
                        return;
                      }
                      setChatEntrySource('chat-list');
                      setActiveScreen('chat');
                      setActiveChat({ chatRoomId: room.chatId, studyName: room.name, imageUrl: room.imageUrl, studyRoomId: room.id, studyRoomHostId: room.studyRoomHostId });
                    }}
                  >
                    {room.imageUrl ? (
                      <Image source={{ uri: room.imageUrl }} style={{ width: 48, height: 48, borderRadius: 10, marginRight: 14 }} />
                    ) : (
                      <View style={{ width: 48, height: 48, borderRadius: 10, marginRight: 14, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#aaa', fontSize: 18 }}>📷</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }} numberOfLines={1}>{room.name}</Text>
                      <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }} numberOfLines={1} ellipsizeMode="tail">
                        {room.lastMsg?.content ? room.lastMsg.content : '메시지가 없습니다'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                      <Text style={{ fontSize: 11, color: '#aaa' }}>
                        {room.lastMsg?.sentAt ? new Date(room.lastMsg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  };

  // 1. 상단에 상태 추가
  const [chatEntrySource, setChatEntrySource] = useState(''); // 'study' | 'chat-list'

  // 1. 상단에 유틸 함수 추가
  function getTimeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000); // 초 단위
    if (diff < 60) return `${diff}초 전 대화`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전 대화`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전 대화`;
    return `${Math.floor(diff / 86400)}일 전 대화`;
  }

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
        <View style={styles.content}>
          {renderScreen()}
        </View>
        {/* 채팅방이 아닐 때만 탭바 표시 */}
        {userInfo && activeScreen !== 'chat' && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'dashboard' && styles.activeTabButton]}
              onPress={() => { setActiveTab('dashboard'); setActiveScreen('dashboard'); }}
            >
              <Text style={styles.tabIcon}>≡</Text>
              <Text style={[styles.tabButtonText, activeTab === 'dashboard' && styles.activeTabButtonText]}>대시보드</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, { flex: 1 }, activeTab === 'community' && styles.activeTabButton]}
              onPress={() => { setActiveTab('community'); setActiveScreen('community'); }}
            >
              <Ionicons name="people-outline" size={22} color="#222" style={[styles.tabIcon, { marginTop: 4 }]} />
              <Text style={[styles.tabButtonText, activeTab === 'community' && styles.activeTabButtonText]}>커뮤니티</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, { flex: 1 }, activeTab === 'study-list' && styles.activeTabButton]}
              onPress={() => { setActiveTab('study-list'); setActiveScreen('list'); }}
            >
              <Ionicons name="book-outline" size={22} color="#222" style={[styles.tabIcon, { marginTop: 4 }]} />
              <Text style={[styles.tabButtonText, activeTab === 'study-list' && styles.activeTabButtonText]}>스터디룸</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, { flex: 1 }, activeTab === 'chat-list' && styles.activeTabButton]}
              onPress={() => { setActiveTab('chat-list'); setActiveScreen('chat-list'); }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#222" style={[styles.tabIcon, { marginTop: 4 }]} />
              <Text style={[styles.tabButtonText, activeTab === 'chat-list' && styles.activeTabButtonText]}>채팅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, { flex: 1 }, activeTab === 'more' && styles.activeTabButton]}
              onPress={() => { setActiveTab('more'); setActiveScreen('more'); }}
            >
              <Text style={[styles.tabIcon, { marginTop: 4 }]}>⋯</Text>
              <Text style={[styles.tabButtonText, activeTab === 'more' && styles.activeTabButtonText]}>더보기</Text>
            </TouchableOpacity>
          </View>
        )}
        <SearchModal />
        <Modal
          transparent={true}
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity 
            style={styles.pickerModalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerDoneButton}>완료</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={studyFormRef.current.category}
                onValueChange={(value) => {
                  const newForm = {...studyFormRef.current, category: value};
                  studyFormRef.current = newForm;
                  setShowPicker(false);
                }}
                style={styles.picker}
              >
                <Picker.Item label="카테고리 선택" value="" />
                <Picker.Item label="📚 프로그래밍 / 개발" value="programming" />
                <Picker.Item label="🎨 디자인" value="design" />
                <Picker.Item label="🌏 외국어" value="language" />
                <Picker.Item label="💼 취업 / 이직" value="job" />
                <Picker.Item label="📊 데이터 사이언스" value="data_science" />
                <Picker.Item label="📱 모바일 앱 개발" value="mobile_dev" />
                <Picker.Item label="🎮 게임 개발" value="game_dev" />
                <Picker.Item label="🔒 보안 / 네트워크" value="security" />
                <Picker.Item label="☁️ 클라우드 / DevOps" value="devops" />
                <Picker.Item label="🤖 AI / 머신러닝" value="ai_ml" />
                <Picker.Item label="🎥 영상 편집" value="video_editing" />
                <Picker.Item label="🎵 음악 / 작곡" value="music" />
                <Picker.Item label="📝 블로그 / 글쓰기" value="writing" />
                <Picker.Item label="📈 주식 / 투자" value="investment" />
                <Picker.Item label="📚 독서" value="reading" />
                <Picker.Item label="✏️ 자격증" value="certification" />
                <Picker.Item label="📋 면접 준비" value="interview" />
                <Picker.Item label="📖 어학시험" value="language_test" />
                <Picker.Item label="🎯 코딩테스트" value="coding_test" />
                <Picker.Item label="🌐 웹 개발" value="web_dev" />
              </Picker>
            </View>
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
                top: 0,
                right: 0,
                width: Dimensions.get('window').width * 0.75,
                height: '100%',
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
              ) : null}
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
                인원수: {participantCounts[joinModal.study?.id] ?? '-'} / {joinModal.study?.peopleCount ?? '-'}명  |  방장: {joinModal.study?.hostName ?? '-'}
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
                  style={[styles.createSubmitButton, joinLoading && { backgroundColor: '#ccc' }, { flex: 1, marginHorizontal: 4 }]}
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

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginLeft: 10,
    marginBottom: 5,
  },
  date: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 25,
    marginHorizontal: 15,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginLeft: 10,
    marginRight: 10,
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
     illustrationContainer: {
     alignItems: 'center',
     marginBottom: 2,
     height: 300,
    backgroundColor: '#ECFFDC',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  illustrationImage: {
    width: '85%',
    height: '85%',
    resizeMode: 'contain',
  },
     welcomeCard: {
     backgroundColor: '#ffffff',
     padding: 20,
     borderRadius: 12,
     marginTop: 25,
     marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  upcomingCard: {
    backgroundColor: '#ECFFDC',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingTitle: {
    fontSize: 14,
    color: '#333',
  },
  upcomingTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4444',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // 오른쪽 정렬
    gap: 0, // 완전히 붙임
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 0,
    alignItems: 'center',
    marginHorizontal: 0,
    marginLeft: 8, // 두 번째 버튼부터 살짝 띄움
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyCard: {
    backgroundColor: '#ECFFDC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  studyProgress: {
    fontSize: 13,
    color: '#222', // 검은색으로 변경
    fontWeight: '500',
    marginLeft: 2,
  },
  studyInfo: {
    gap: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participant: {
    fontSize: 20,
    marginRight: 8,
  },
  addParticipantButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipant: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  nextMeeting: {
    fontSize: 13,
    color: '#666',
  },
  createForm: {
    backgroundColor: '#ECFFDC',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
     tabBar: {
     flexDirection: 'row',
     backgroundColor: '#ffffff',
     borderTopWidth: 1,
     borderTopColor: '#eee',
     paddingBottom: 10,
     paddingTop: 5,
   },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabButton: {
    // 활성 탭 스타일은 텍스트 색상으로 처리
  },
  tabButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#222',
    fontWeight: 'bold',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
     bottomContent: {
     paddingHorizontal: 20,
     marginBottom: 20,
     position: 'absolute',
     bottom: 5,
     left: 0,
     right: 0,
   },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    width: '100%',
    marginVertical: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scheduleText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    marginRight: 10,
  },
  scheduleText1: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
    marginRight: 10,
  },
  scheduleTime: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: 'bold',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerModalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    paddingTop: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  closeButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  searchModalContent: {
    maxWidth: 440,
  },
  searchContainer: {
    padding: 24,
  },
  searchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  searchTypeActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  searchTypeTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  studyListSection: {
    marginTop: -10,
    marginHorizontal: 0,
    flex: 1, // 스크롤 영역이 화면을 꽉 채우도록 추가
  },
  studyListContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: -12,
    flex: 1, // 스크롤뷰가 남은 공간을 모두 차지하도록 추가
  },
  studyListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  studyItemContent: {
    gap: 12,
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  studyProgress: {
    fontSize: 13,
    color: '#222', // 검은색으로 변경
    fontWeight: '500',
    marginLeft: 2,
  },
  studyInfo: {
    gap: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participant: {
    fontSize: 20,
    marginRight: 8,
  },
  addParticipantButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipant: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  nextMeeting: {
    fontSize: 13,
    color: '#666',
  },
  moreSection: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: -8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  moreItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moreIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFFDC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moreIcon: {
    fontSize: 20,
  },
  moreTextContainer: {
    flex: 1,
  },
  moreItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  moreItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  moreArrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  noResultContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  createModalContent: {
    width: '90%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: -15,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgrey',
  },
  createModalTitle: {
    marginLeft: 5,
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
  },
  createCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    color: 'black',
  },
  createCloseButtonText: {
    fontSize: 18,
    color: 'black',
    fontWeight: '300',
    marginTop: -2,
  },
  createFormContainer: {
    padding: 20,
  },
  createFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
    marginBottom: 0,
  },
  createFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  createFormInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
    marginBottom: 15,
  },
  createTextArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 12,
    lineHeight: 20,
  },
  createPeopleCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  createPeopleCountInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  createPeopleCountLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  createModalFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createSubmitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: -30
  },
  createSubmitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 20,
  },
  scheduleList: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  scheduleItem: {
    marginBottom: 25,
  },
  scheduleItemHeader: {
    marginBottom: 10,
  },
  dateBadge: {
    backgroundColor: '#ECFFDC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  scheduleDate: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  scheduleItemContent: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    padding: 2,
  },
  scheduleTimeContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    width: 75,
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  scheduleTimeLine: {
    width: 2,
    height: '70%',
    backgroundColor: '#ECFFDC',
    position: 'absolute',
    right: 0,
    top: '15%',
  },
  scheduleMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 10,
  },
  scheduleItemTitle: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  scheduleMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleStatusBadge: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  scheduleStatusText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  scheduleDuration: {
    fontSize: 13,
    color: '#666',
  },
  scheduleActionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  picker: {
    width: '100%',
    height: 215,
  },
  placeholderText: {
    color: '#999',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 44,
    marginTop: 5
  },
  categoryText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  categoryArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryCloseButton: {
    padding: 8,
  },
  categoryCloseButtonText: {
    fontSize: 20,
    color: '#666',
  },
  categoryList: {
    padding: 12,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  categoryItemSelected: {
    backgroundColor: '#ECFFDC',
  },
  categoryItemText: {
    fontSize: 15,
    color: '#333',
  },
  categoryItemTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: 48,
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
    marginTop: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  actionIconContainer: {
    marginRight: 8,
  },
  categoryButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: 'transparent',
  },
  categoryButtonSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  categoryButtonText: {
    color: '#222',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  hostNameText: {
    fontSize: 13,
    color: '#222', // 검은색으로 변경
    fontWeight: '500',
    marginLeft: 6,
  },
  studyDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginBottom: 4,
  },
});

export default StudyApp;


