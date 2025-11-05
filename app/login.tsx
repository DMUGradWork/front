import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useApiBaseUrl } from './study/hooks/useApiBaseUrl';

export default function Login(): JSX.Element {
  const router = useRouter();
  // auth-service는 Docker로 포트 8082에서 실행 중
  // IP는 자동으로 감지되며, tunnel을 사용하는 경우 환경 변수나 설정에서 URL을 변경하세요
  const baseUrl = useApiBaseUrl('172.16.113.138', 8082);
  
  // baseUrl이 변경될 때마다 로그 출력
  useEffect(() => {
    console.log('[Login] Base URL 변경됨:', baseUrl);
  }, [baseUrl]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  const handleContinue = (): void => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setNotice('이메일을 입력해주세요.');
      return;
    }
    // 존재 여부 확인을 위해 더미 비밀번호로 /auth/login 시도
    setLoading(true);
    const loginUrl = `${baseUrl}/auth/login`;
    console.log('[Login] API URL:', loginUrl);
    console.log('[Login] Request payload:', { email: trimmed, password: '__probe_password__' });
    
    axios
      .post(loginUrl, { email: trimmed, password: '__probe_password__' }, {
        timeout: 10000, // 10초 타임아웃
      })
      .then(() => {
        // 정상 로그인 응답이 올 일은 없지만, 온다면 바로 로그인 처리로 분기 가능
        setShowPassword(true);
        setNotice('');
      })
      .catch((error) => {
        console.log('[email-probe] Full error:', error);
        console.log('[email-probe] Error details:', {
          status: error?.response?.status,
          message: error?.message,
          code: error?.code,
          responseData: error?.response?.data,
          requestUrl: error?.config?.url,
        });
        
        const status = error?.response?.status;
        if (status === 401) {
          // 계정은 존재하지만 비밀번호가 틀림
          setShowPassword(true);
          setNotice('');
        } else if (status === 404) {
          // 계정 없음 -> 회원가입 모달 표시
          setNotice('');
          setShowSignupPrompt(true);
        } else if (status === 400) {
          // DTO 검증 실패 등: 서버 정책 상 probe 실패 -> 회원가입 안내로 유도
          setNotice('계정 확인에 실패했습니다.');
          setShowSignupPrompt(true);
        } else {
          // 네트워크 에러인 경우
          if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
            console.error('[Login] Network error:', error.code);
            setNotice(`네트워크 연결 실패 (${baseUrl}). 서버가 실행 중인지 확인해주세요.`);
          } else {
            setNotice('로그인 서버와 통신 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          }
        }
      })
      .finally(() => setLoading(false));
  };

  const handleLogin = (): void => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setNotice('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    axios
      .post(`${baseUrl}/auth/login`, { email: trimmed, password })
      .then(async (res) => {
        try {
          const token = res?.data?.accessToken || res?.data?.token || '';
          if (token) {
            await SecureStore.setItemAsync('auth_token', token);
          }
          // 로그인 성공 후 이메일로 사용자 정보 조회
          const userRes = await axios.get(`${baseUrl}/auth/users/email`, { params: { email: trimmed } });
          const nameFromDb = userRes?.data?.name;
          setNotice('');
          if (nameFromDb) {
            router.replace({ pathname: '/main', params: { name: nameFromDb } });
            return;
          }
          router.replace('/main');
        } catch (e) {
          setNotice('로그인 처리 중 오류가 발생했습니다.');
          router.replace('/main');
        }
      })
      .catch((error) => {
        console.log('[login] error', error?.response?.status, error?.message, error?.response?.data);
        const status = error?.response?.status;
        if (status === 401) {
          setNotice('비밀번호가 올바르지 않습니다. 다시 시도해주세요.');
        } else if (status === 404) {
          setNotice('계정을 찾을 수 없습니다. 회원가입 화면으로 이동합니다.');
          router.push({ pathname: '/signup', params: { email: trimmed } });
        } else {
          setNotice('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
      });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', marginTop: -96 }}>
        <View style={{ alignItems: 'center', marginBottom: 80 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', marginBottom: 8 }}>GrewMeet</Text>
          <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 4 }}>쉽게 가입하고</Text>
          <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>간편하게 로그인하세요.</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>연애와 공부를 사로잡는, 그루밋</Text>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, marginBottom: 8 }}>이메일</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="이메일을 입력해주세요."
            placeholderTextColor="#9CA3AF"
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              backgroundColor: '#fff',
            }}
          />
        </View>

        {!showPassword && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={{
            backgroundColor: '#111827',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 12,
          }}
          onPress={handleContinue}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>이메일로 계속하기</Text>
        </TouchableOpacity>
        )}

        {notice && !showPassword ? (
          <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>{notice}</Text>
        ) : null}

        {showPassword ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, marginBottom: 8 }}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호를 입력해주세요."
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                backgroundColor: '#111827',
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                marginTop: 20,
              }}
              onPress={handleLogin}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>로그인</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          style={{ alignSelf: 'center', marginTop: 16 }}
          onPress={() => { /* handle forgot account */ }}
        >
          <Text style={{ fontSize: 14, color: '#6b7280' }}>계정을 잊으셨나요? &gt;</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ alignSelf: 'center', marginTop: 12 }}
          onPress={() => router.push('/signup')}
        >
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600' }}>회원가입</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showSignupPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignupPrompt(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '84%', backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>안내</Text>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
              계정이 존재하지 않아 회원가입 페이지로 이동합니다.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowSignupPrompt(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, color: '#6B7280' }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowSignupPrompt(false);
                  const trimmed = email.trim().toLowerCase();
                  router.push({ pathname: '/signup', params: { email: trimmed } });
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600' }}>이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}



