import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import ImageSplash from '../app/components/ImageSplash';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const timeoutRef = useRef(null);

  const handleNavigate = () => {
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      router.push('/first');
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
