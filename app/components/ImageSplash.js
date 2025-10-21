import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function ImageSplash() {
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Image
        source={require('../../assets/images/Group1.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', 
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#23BE60',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  image: {
    marginTop: 60,
    width: '80%',
    height: '80%',
  },
});
