import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        // 스와이프 백 시 스택 히스토리에서 이전 페이지로 이동
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen
        name="main"
        options={{
          gestureEnabled: false, // 메인 화면에서는 스와이프 비활성화
        }}
      />
      <Stack.Screen
        name="study"
        options={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true,
          // 모달이 아닌 일반 스택으로 표시하여 스와이프 백이 이전 페이지로 이동하도록 함
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="dating"
        options={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="user"
        options={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}


