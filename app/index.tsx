import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import ImageSplash from './components/ImageSplash';

export default function HomeScreen(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigate = (): void => {
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      router.push('/study');
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return <ImageSplash />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>홈 화면</Text>
      <Button title="이동" onPress={handleNavigate} />
    </View>
  );
}
