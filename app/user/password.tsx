import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useApiBaseUrl } from '../study/hooks/useApiBaseUrl';

export default function PasswordChange(): JSX.Element {
  const router = useRouter();
  // auth-service는 Docker로 포트 8082에서 실행 중
  const baseUrl = useApiBaseUrl('172.16.113.138', 8082);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPasswordError, setCurrentPasswordError] = useState<string>('');
  const [currentPasswordSuccess, setCurrentPasswordSuccess] = useState<boolean>(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);

  const extractUserIdFromToken = async (): Promise<string | null> => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        return null;
      }

      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

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
      return json?.userId || json?.sub || null;
    } catch (e) {
      console.log('Token decode error:', e);
      return null;
    }
  };

  const extractEmailFromToken = async (): Promise<string | null> => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        return null;
      }

      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

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
      // JWT 토큰의 sub 필드는 보통 email입니다
      const email = json?.sub || json?.email;
      
      // 만약 토큰에 이메일이 없으면 userId로 사용자 정보를 가져와서 이메일을 조회
      if (!email) {
        const userId = json?.userId;
        if (userId) {
          const userRes = await axios.get(`${baseUrl}/auth/users/${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return userRes?.data?.email || null;
        }
      }
      
      return email || null;
    } catch (e) {
      console.log('Token decode error:', e);
      return null;
    }
  };

  const verifyCurrentPassword = async (password: string): Promise<void> => {
    if (!password || password.length === 0) {
      setCurrentPasswordError('');
      setCurrentPasswordSuccess(false);
      return;
    }

    setIsCheckingPassword(true);
    setCurrentPasswordError('');
    setCurrentPasswordSuccess(false);
    
    try {
      const email = await extractEmailFromToken();
      if (!email) {
        setCurrentPasswordError('사용자 정보를 찾을 수 없습니다.');
        setCurrentPasswordSuccess(false);
        return;
      }

      await axios.post(`${baseUrl}/auth/login`, {
        email,
        password,
      });

      // 로그인 성공 = 비밀번호 일치
      setCurrentPasswordError('');
      setCurrentPasswordSuccess(true);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 404) {
        setCurrentPasswordError('현재 비밀번호가 일치하지 않습니다.');
        setCurrentPasswordSuccess(false);
      } else {
        setCurrentPasswordError('비밀번호 확인 중 오류가 발생했습니다.');
        setCurrentPasswordSuccess(false);
      }
    } finally {
      setIsCheckingPassword(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('현재 비밀번호와 새 비밀번호가 동일합니다.');
      return;
    }

    setLoading(true);
    try {
      const userId = await extractUserIdFromToken();
      if (!userId) {
        setError('로그인이 필요합니다.');
        router.replace('/login');
        return;
      }

      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setError('로그인이 필요합니다.');
        router.replace('/login');
        return;
      }

      await axios.put(
        `${baseUrl}/auth/users/${encodeURIComponent(userId)}/password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert('성공', '비밀번호가 변경되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.log('Password change error:', error?.response?.status, error?.message, error?.response?.data);
      const status = error?.response?.status;
      if (status === 401) {
        setError('현재 비밀번호가 올바르지 않습니다.');
      } else if (status === 404) {
        setError('사용자를 찾을 수 없습니다.');
      } else {
        setError('비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* 상단 헤더 */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
              <Text style={{ fontSize: 16, color: '#111827' }}>‹ 뒤로</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>비밀번호 변경</Text>
            <View style={{ width: 50 }} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>현재 비밀번호</Text>
            <TextInput
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setCurrentPasswordError('');
                setCurrentPasswordSuccess(false);
              }}
              onBlur={() => {
                if (currentPassword) {
                  verifyCurrentPassword(currentPassword);
                }
              }}
              secureTextEntry
              placeholder="현재 비밀번호를 입력해주세요."
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: currentPasswordError ? '#ef4444' : currentPasswordSuccess ? '#10b981' : error ? '#ef4444' : '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
            />
            {currentPasswordError ? (
              <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{currentPasswordError}</Text>
            ) : currentPasswordSuccess ? (
              <Text style={{ fontSize: 12, color: '#10b981', marginTop: 6 }}>현재 비밀번호가 일치합니다.</Text>
            ) : isCheckingPassword ? (
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>확인 중...</Text>
            ) : null}
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>새 비밀번호</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="새 비밀번호를 입력해주세요. (최소 8자)"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: error ? '#ef4444' : '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
            />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>최소 8자 이상 입력해주세요.</Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>새 비밀번호 확인</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="새 비밀번호를 다시 입력해주세요."
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: error ? '#ef4444' : '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#fff',
              }}
            />
          </View>

          {error ? (
            <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 14, color: '#dc2626', textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor: '#111827',
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

