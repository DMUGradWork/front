import React, { useState } from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  isImportant: boolean;
  category: string;
}

// 더미 공지사항 데이터
const NOTICES: Notice[] = [
  {
    id: 1,
    title: 'GrewMeet 서비스 업데이트 안내',
    content: `안녕하세요, GrewMeet입니다.

서비스 개선을 위해 다음과 같은 업데이트를 진행했습니다.

[주요 변경사항]
• 스터디 그룹 검색 기능 개선
• 채팅방 UI/UX 개선
• 공고 모집 페이지 추가
• 성능 최적화

더 나은 서비스 제공을 위해 지속적으로 노력하겠습니다.
감사합니다.`,
    date: '2025.11.04',
    isImportant: true,
    category: '서비스',
  },
  {
    id: 2,
    title: '개인정보 처리방침 개정 안내',
    content: `안녕하세요, GrewMeet입니다.

개인정보 보호법에 따라 개인정보 처리방침을 개정하였습니다.

[개정 내용]
• 개인정보 수집 및 이용 목적 명확화
• 개인정보 보유기간 명시
• 개인정보 제3자 제공 관련 내용 추가

자세한 내용은 개인정보 처리방침을 확인해주세요.
적용일: 2025년 11월 1일`,
    date: '2025.11.01',
    isImportant: true,
    category: '약관',
  },
  {
    id: 3,
    title: '이메일 인증 기능 추가 안내',
    content: `안녕하세요, GrewMeet입니다.

회원가입 시 이메일 인증 기능이 추가되었습니다.

[변경사항]
• 회원가입 시 이메일 인증코드 발송
• 인증코드 확인 후 가입 완료
• 계정 보안 강화

이메일 인증을 완료하시면 더욱 안전하게 서비스를 이용하실 수 있습니다.`,
    date: '2025.10.28',
    isImportant: false,
    category: '기능',
  },
  {
    id: 4,
    title: '스터디 그룹 생성 가이드',
    content: `안녕하세요, GrewMeet입니다.

효과적인 스터디 그룹을 만들기 위한 가이드를 안내드립니다.

[스터디 그룹 생성 팁]
1. 명확한 목표와 주제 설정
2. 적절한 인원 수 설정 (3-8명 권장)
3. 정기적인 모임 일정 공유
4. 활동적인 소통과 피드백

함께 성장하는 스터디 문화를 만들어가요!`,
    date: '2025.10.25',
    isImportant: false,
    category: '가이드',
  },
  {
    id: 5,
    title: '11월 정기 점검 안내',
    content: `안녕하세요, GrewMeet입니다.

서비스 안정성 향상을 위한 정기 점검을 실시합니다.

[점검 일정]
• 일시: 2025년 11월 15일 (목) 오전 2시 ~ 오전 4시
• 점검 시간: 약 2시간
• 영향 범위: 서비스 일시 중단

점검 시간 동안 서비스 이용이 제한될 수 있습니다.
불편을 드려 죄송합니다.`,
    date: '2025.10.20',
    isImportant: false,
    category: '공지',
  }
];

export default function NoticeScreen(): JSX.Element {
  const router = useRouter();
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const formatDate = (dateString: string): string => {
    return dateString;
  };

  if (selectedNotice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <TouchableOpacity
            onPress={() => setSelectedNotice(null)}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>공지사항</Text>
        </View>

        {/* 상세 내용 */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {selectedNotice.isImportant && (
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>중요</Text>
                </View>
              )}
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{selectedNotice.category}</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              {selectedNotice.title}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              {formatDate(selectedNotice.date)}
            </Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 }}>
            <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>
              {selectedNotice.content}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>공지사항</Text>
      </View>

      {/* 공지사항 목록 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {NOTICES.map((notice) => (
          <TouchableOpacity
            key={notice.id}
            onPress={() => setSelectedNotice(notice)}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: notice.isImportant ? 2 : 1,
              borderColor: notice.isImportant ? '#EF4444' : '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {notice.isImportant && (
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>중요</Text>
                </View>
              )}
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{notice.category}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              {notice.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              {formatDate(notice.date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

