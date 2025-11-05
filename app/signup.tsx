import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { useApiBaseUrl } from './study/hooks/useApiBaseUrl';

type Step = 1 | 2 | 3;

// 한국 시도 데이터
const REGIONS: Record<string, string[]> = {
  '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
  '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  '인천광역시': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
  '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
  '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
  '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
  '강원특별자치도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
  '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'],
  '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  '전북특별자치도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
  '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
  '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '진해시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
  '제주특별자치도': ['서귀포시', '제주시']
};

// 성격 옵션 (확장)
const PERSONALITY_OPTIONS = [
  '열정', '성실', '도전', '협력', '리더십', '창의', '긍정', '책임감',
  '친절', '적극적', '소통', '인내', '유연', '체계적', '목표지향', '팀워크',
  '배려', '신뢰', '정직', '자기주도', '빠른학습', '문제해결', '의사결정', '계획성'
];

// ⭐️ 분리된 InfoStep 컴포넌트
interface InfoStepProps {
  email: string;
  setEmail: (text: string) => void;
  name: string;
  setName: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
  password2: string;
  setPassword2: (text: string) => void;
  phone: string;
  setPhone: (text: string) => void;
  gender: string;
  setGender: (gender: string) => void;
  region: string;
  setRegion: (region: string) => void;
  personality: string[];
  setPersonality: (personality: string[]) => void;
  passwordMatch: boolean;
  setStep: (step: Step) => void;
  baseUrl: string;
  // Ref들을 Props로 받습니다.
  nameRef: React.RefObject<TextInput>;
  passRef: React.RefObject<TextInput>;
  pass2Ref: React.RefObject<TextInput>;
  phoneRef: React.RefObject<TextInput>;
  // 인증코드 관련
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isEmailVerified: boolean;
  setIsEmailVerified: (verified: boolean) => void;
  verificationCodeRef: React.RefObject<TextInput>;
}

const InfoStep = React.memo(({
  email, setEmail, name, setName, password, setPassword, password2, setPassword2, phone, setPhone,
  gender, setGender, region, setRegion, personality, setPersonality, passwordMatch, setStep, baseUrl, nameRef, passRef, pass2Ref, phoneRef,
  verificationCode, setVerificationCode, isEmailVerified, setIsEmailVerified, verificationCodeRef
}: InfoStepProps) => {
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [timer, setTimer] = useState(0); // 초 단위
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  // 타이머 효과
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // 이메일 형식 검증
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 인증코드 전송
  const handleSendVerificationCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail) {
      setVerificationError('이메일을 입력해주세요.');
      return;
    }
    
    if (!isValidEmail(normalizedEmail)) {
      setVerificationError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setIsSendingCode(true);
    setVerificationError('');
    setIsEmailVerified(false);
    setVerificationCode('');

    try {
      // TODO: 백엔드 API 엔드포인트에 맞게 수정 필요
      // 예: POST /auth/email/verification/send
      await axios.post(`${baseUrl}/auth/email/verification/send`, {
        email: normalizedEmail,
      });
      
      // 성공 시 타이머 시작 (3분 = 180초)
      setTimer(180);
      console.log('[signup] 인증코드 전송 성공');
    } catch (e: any) {
      console.log('[signup] 인증코드 전송 실패', e?.response?.status, JSON.stringify(e?.response?.data, null, 2));
      
      // 더미 구현: 백엔드 API가 없을 경우에도 UI 동작하도록
      if (e?.response?.status === 404 || e?.code === 'ECONNREFUSED') {
        console.log('[signup] 백엔드 API가 없어 더미로 처리');
        // 더미: 성공한 것처럼 처리
        setTimer(180);
        setVerificationError('');
      } else {
        setVerificationError('인증코드 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  // 인증코드 검증
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) {
      setVerificationError('인증코드를 입력해주세요.');
      return;
    }

    setIsVerifyingCode(true);
    setVerificationError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // TODO: 백엔드 API 엔드포인트에 맞게 수정 필요
      // 예: POST /auth/email/verification/verify
      await axios.post(`${baseUrl}/auth/email/verification/verify`, {
        email: normalizedEmail,
        code: verificationCode,
      });
      
      setIsEmailVerified(true);
      setTimer(0);
      setVerificationError('');
      console.log('[signup] 인증코드 검증 성공');
    } catch (e: any) {
      console.log('[signup] 인증코드 검증 실패', e?.response?.status, JSON.stringify(e?.response?.data, null, 2));
      
      // 더미 구현: 백엔드 API가 없을 경우에도 UI 동작하도록
      if (e?.response?.status === 404 || e?.code === 'ECONNREFUSED') {
        console.log('[signup] 백엔드 API가 없어 더미로 처리');
        // 더미: 4자리 코드면 성공한 것처럼 처리
        if (verificationCode.length === 4) {
          setIsEmailVerified(true);
          setTimer(0);
          setVerificationError('');
        } else {
          setVerificationError('인증코드가 올바르지 않습니다.');
        }
      } else {
        setVerificationError('인증코드가 올바르지 않습니다.');
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 타이머 포맷팅 (MM:SS)
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = async () => {
    if (!email || !passwordMatch || !name || !phone || !gender || !region || personality.length === 0) return;
    
    // 이메일 인증 검증 (인증코드가 발송되었지만 인증이 완료되지 않은 경우)
    if (timer > 0 && !isEmailVerified) {
      setVerificationError('이메일 인증을 완료해주세요.');
      return;
    }
    
    // 비밀번호 최소 길이 확인
    if (password.length < 8) {
      console.log('[signup] validation error: password must be at least 8 characters');
      return;
    }
    
    try {
      // auth-service는 Docker로 포트 8082에서 실행 중
      // 전화번호 포맷팅: 01X-XXXX-XXXX 형식 (정규식: ^01[0-9]-[0-9]{4}-[0-9]{4}$)
      let normalizedPhone = phone.trim().replace(/[^0-9]/g, ''); // 숫자만 추출
      if (normalizedPhone.length === 11 && normalizedPhone.startsWith('01')) {
        normalizedPhone = `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 7)}-${normalizedPhone.slice(7)}`;
      } else if (normalizedPhone.length === 10 && normalizedPhone.startsWith('010')) {
        // 010으로 시작하는 10자리 번호는 11자리로 변환하지 않음
        normalizedPhone = phone; // 원본 유지
      }
      
      // 이메일 소문자 변환 및 trim
      const normalizedEmail = email.trim().toLowerCase();
      
      const requestBody = {
        email: normalizedEmail,
        password: password,
        name: name.trim(),
        phoneNumber: normalizedPhone,
        role: 'USER', // 백엔드가 enum으로 자동 변환함
        gender: gender, // 성별 정보
        region: region, // 지역 정보
        personality: personality.join(','), // 성격 정보 (쉼표로 구분)
      };
      
      console.log('[signup] request body:', JSON.stringify(requestBody, null, 2));
      
      await axios.post(`${baseUrl}/auth/users/register`, requestBody);
      setStep(3);
    } catch (e: any) {
      console.log('[signup] error', e?.response?.status, JSON.stringify(e?.response?.data, null, 2));
      // 사용자에게 에러 메시지 표시 (선택사항)
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>정보입력</Text>
        <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
              <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>이메일</Text>
              <View style={{ flexDirection: 'row' }}>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setIsEmailVerified(false);
                    setVerificationCode('');
                    setTimer(0);
                    setVerificationError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  textContentType="emailAddress"
                  onSubmitEditing={() => nameRef.current?.focus()}
                  editable={!isEmailVerified}
                  style={{ 
                    flex: 1,
                    borderWidth: 1, 
                    borderColor: isEmailVerified ? '#10B981' : '#E5E7EB', 
                    borderRadius: 10, 
                    paddingHorizontal: 14, 
                    paddingVertical: 12, 
                    fontSize: 16,
                    backgroundColor: isEmailVerified ? '#F0FDF4' : '#fff',
                    marginRight: 8,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSendVerificationCode}
                  disabled={isSendingCode || !email.trim() || !isValidEmail(email.trim()) || isEmailVerified}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: (isSendingCode || !email.trim() || !isValidEmail(email.trim()) || isEmailVerified) ? '#9CA3AF' : '#111827',
                    borderRadius: 10,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                    {isSendingCode ? '전송중...' : isEmailVerified ? '인증완료' : '인증코드 전송'}
                  </Text>
                </TouchableOpacity>
              </View>
              {timer > 0 && !isEmailVerified && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    ref={verificationCodeRef}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="인증코드 입력"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: verificationError ? '#EF4444' : '#E5E7EB',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      marginRight: 8,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleVerifyCode}
                    disabled={isVerifyingCode || !verificationCode || verificationCode.length < 4}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: (isVerifyingCode || !verificationCode || verificationCode.length < 4) ? '#9CA3AF' : '#111827',
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      {isVerifyingCode ? '확인중...' : '확인'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {timer > 0 && !isEmailVerified && (
                <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#EF4444' }}>
                    {formatTimer(timer)} 후 만료
                  </Text>
                  <TouchableOpacity
                    onPress={handleSendVerificationCode}
                    disabled={isSendingCode || timer > 150}
                  >
                    <Text style={{ fontSize: 12, color: timer > 150 ? '#9CA3AF' : '#111827', textDecorationLine: 'underline' }}>
                      재전송
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isEmailVerified && (
                <Text style={{ marginTop: 6, fontSize: 12, color: '#10B981' }}>
                  ✓ 이메일 인증이 완료되었습니다.
                </Text>
              )}
              {verificationError && (
                <Text style={{ marginTop: 6, fontSize: 12, color: '#EF4444' }}>
                  {verificationError}
                </Text>
              )}
               </View>
               <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>이름</Text>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="홍길동"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
                textContentType="name"
                onSubmitEditing={() => passRef.current?.focus()}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
              />
               </View>
               <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>비밀번호</Text>
              <TextInput
                ref={passRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="비밀번호"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
                textContentType="newPassword"
                onSubmitEditing={() => pass2Ref.current?.focus()}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
              />
               </View>
               <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>비밀번호 확인</Text>
              <TextInput
                ref={pass2Ref}
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry
                placeholder="비밀번호 확인"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
                textContentType="password"
                onSubmitEditing={() => phoneRef.current?.focus()}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
              />
              {!passwordMatch && password2.length > 0 ? (
                <Text style={{ marginTop: 6, fontSize: 12, color: '#EF4444' }}>비밀번호가 일치하지 않습니다.</Text>
              ) : null}
               </View>
               <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>연락처</Text>
              <TextInput
                ref={phoneRef}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="010-1234-5678"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="done"
                textContentType="telephoneNumber"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>성별</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setGender('male')}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: gender === 'male' ? '#111827' : '#E5E7EB',
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: gender === 'male' ? '#111827' : '#fff',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: gender === 'male' ? '#fff' : '#111827', fontSize: 16, fontWeight: '600' }}>남자</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setGender('female')}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: gender === 'female' ? '#111827' : '#E5E7EB',
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: gender === 'female' ? '#111827' : '#fff',
                  }}
                >
                  <Text style={{ color: gender === 'female' ? '#fff' : '#111827', fontSize: 16, fontWeight: '600' }}>여자</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>지역</Text>
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
              {region && (
                <Text style={{ fontSize: 12, color: '#10B981' }}>
                  ✓ 선택된 지역: {region}
                </Text>
              )}
              
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
                            setRegion('');
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
                            setRegion(`${selectedCity} ${district}`);
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
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, marginBottom: 8 }}>성격 (최대 2개 선택)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {PERSONALITY_OPTIONS.map((person) => {
                  const isSelected = personality.includes(person);
                  const isDisabled = !isSelected && personality.length >= 2;
                  return (
                    <TouchableOpacity
                      key={person}
                      activeOpacity={0.8}
                      disabled={isDisabled}
                      onPress={() => {
                        if (isSelected) {
                          setPersonality(personality.filter(p => p !== person));
                        } else {
                          if (personality.length < 2) {
                            setPersonality([...personality, person]);
                          }
                        }
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: isSelected ? '#111827' : isDisabled ? '#D1D5DB' : '#E5E7EB',
                        borderRadius: 20,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        backgroundColor: isSelected ? '#111827' : isDisabled ? '#F3F4F6' : '#fff',
                        marginRight: 8,
                        marginBottom: 8,
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: isSelected ? '#fff' : isDisabled ? '#9CA3AF' : '#111827', fontSize: 14, fontWeight: isSelected ? '600' : '400' }}>{person}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {personality.length > 0 && (
                <Text style={{ fontSize: 12, color: personality.length === 2 ? '#10B981' : '#6B7280', marginTop: 4 }}>
                  {personality.length === 2 ? '✓ 최대 2개 선택 완료' : `선택된 성격: ${personality.length}/2`}
                </Text>
              )}
            </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', marginTop: 20 }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setStep(1)} style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8 }}>
          <Text style={{ fontSize: 14, color: '#111827' }}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          style={{ flex: 1, backgroundColor: passwordMatch && email && gender && region && personality.length > 0 ? '#111827' : '#9CA3AF', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Memoization을 통해 부모의 다른 상태 변경은 무시하고, InfoStep 관련 Props만 비교
  return (
    prevProps.email === nextProps.email &&
    prevProps.name === nextProps.name &&
    prevProps.password === nextProps.password &&
    prevProps.password2 === nextProps.password2 &&
    prevProps.phone === nextProps.phone &&
    prevProps.gender === nextProps.gender &&
    prevProps.region === nextProps.region &&
    JSON.stringify(prevProps.personality) === JSON.stringify(nextProps.personality) &&
    prevProps.passwordMatch === nextProps.passwordMatch &&
    prevProps.baseUrl === nextProps.baseUrl &&
    prevProps.nameRef === nextProps.nameRef &&
    prevProps.passRef === nextProps.passRef &&
    prevProps.pass2Ref === nextProps.pass2Ref &&
    prevProps.phoneRef === nextProps.phoneRef &&
    prevProps.verificationCode === nextProps.verificationCode &&
    prevProps.isEmailVerified === nextProps.isEmailVerified &&
    prevProps.verificationCodeRef === nextProps.verificationCodeRef
  );
});

// --- 메인 Signup 컴포넌트 ---
export default function Signup(): JSX.Element {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const emailParam = (params.email as string) || '';

  // auth-service base URL
  const baseUrl = useApiBaseUrl('172.16.113.138', 8082);

  const [step, setStep] = useState<Step>(1);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [email, setEmail] = useState(emailParam);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Ref는 Signup 컴포넌트 레벨에 유지
  const nameRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const pass2Ref = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const verificationCodeRef = useRef<TextInput>(null);

  const allRequiredChecked = useMemo(() => agreeTerms && agreePrivacy, [agreeTerms, agreePrivacy]);
  const passwordMatch = useMemo(() => password.length > 0 && password === password2, [password, password2]);

  const StepHeader = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
      {[
        { n: 1, label: '약관동의' },
        { n: 2, label: '정보입력' },
        { n: 3, label: '완료' },
      ].map((s) => {
        const active = step === (s.n as Step);
        return (
          <View key={s.n} style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? '#111827' : '#E5E7EB',
                marginBottom: 6,
                alignSelf: 'center',
              }}
            >
              <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '700' }}>{s.n}</Text>
            </View>
            <Text style={{ fontSize: 12, color: active ? '#111827' : '#6B7280' }}>{s.label}</Text>
          </View>
        );
      })}
    </View>
  );

  // Step 1: 약관동의
  const TermsStep = () => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>약관동의</Text>
      <ScrollView style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, maxHeight: 320 }}>
        <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
          [필수] 서비스 이용약관{"\n"}
          1. 본 약관은 GrewMeet 서비스의 이용과 관련하여 적용됩니다.{"\n"}
          2. 사용자는 서비스 이용 시 개인정보 보호정책을 준수합니다.{"\n"}
          3. 서비스 내 콘텐츠의 무단 복제, 배포, 전송을 금지합니다.{"\n"}
          4. 기타 자세한 내용은 회사가 정한 정책을 따릅니다.{"\n\n"}
          [필수] 개인정보 처리방침 요약{"\n"}
          - 수집항목: 이메일, 이름, 비밀번호, 연락처 등.{"\n"}
          - 이용목적: 회원 식별, 서비스 제공, 고객지원.{"\n"}
          - 보유기간: 회원 탈퇴 시까지 또는 관련 법령에 따른 기간.{"\n\n"}
          [선택] 마케팅 정보 수신 동의{"\n"}
          - 이벤트, 프로모션, 맞춤형 소식 제공을 위한 정보 수신.
        </Text>
      </ScrollView>

      <View style={{ marginTop: 16 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            const next = !(agreeTerms && agreePrivacy && agreeMarketing);
            setAgreeTerms(next);
            setAgreePrivacy(next);
            setAgreeMarketing(next);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: agreeTerms && agreePrivacy && agreeMarketing ? '#111827' : '#fff', marginRight: 8 }} />
          <Text style={{ fontSize: 14 }}>전체 동의</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setAgreeTerms((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: agreeTerms ? '#111827' : '#fff', marginRight: 8 }} />
          <Text style={{ fontSize: 14 }}>[필수] 서비스 이용약관 동의</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setAgreePrivacy((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: agreePrivacy ? '#111827' : '#fff', marginRight: 8 }} />
          <Text style={{ fontSize: 14 }}>[필수] 개인정보 처리방침 동의</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setAgreeMarketing((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: agreeMarketing ? '#111827' : '#fff', marginRight: 8 }} />
          <Text style={{ fontSize: 14 }}>[선택] 마케팅 정보 수신 동의</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={{ backgroundColor: allRequiredChecked ? '#111827' : '#9CA3AF', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 }}
        onPress={() => allRequiredChecked && setStep(2)}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>다음</Text>
      </TouchableOpacity>
    </View>
  );

  const DoneStep = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>회원가입 완료</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>가입이 완료되었습니다. 로그인 화면으로 이동합니다.</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.replace('/login')}
        style={{ backgroundColor: '#111827', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>로그인으로 이동</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>GrewMeet</Text>
        </View>
        <StepHeader />
        {step === 1 && <TermsStep />}
        {step === 2 && (
          // ⭐️ 분리된 InfoStep 컴포넌트를 호출하고 Props 전달
          <InfoStep
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            password={password}
            setPassword={setPassword}
            password2={password2}
            setPassword2={setPassword2}
            phone={phone}
            setPhone={setPhone}
            gender={gender}
            setGender={setGender}
            region={region}
            setRegion={setRegion}
            personality={personality}
            setPersonality={setPersonality}
            passwordMatch={passwordMatch}
            setStep={setStep}
            baseUrl={baseUrl}
            nameRef={nameRef}
            passRef={passRef}
            pass2Ref={pass2Ref}
            phoneRef={phoneRef}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            isEmailVerified={isEmailVerified}
            setIsEmailVerified={setIsEmailVerified}
            verificationCodeRef={verificationCodeRef}
          />
        )}
        {step === 3 && <DoneStep />}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}