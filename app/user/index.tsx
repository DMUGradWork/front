import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function UserHome(): JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>User — WIP</Text>
      </View>
    </SafeAreaView>
  );
}

