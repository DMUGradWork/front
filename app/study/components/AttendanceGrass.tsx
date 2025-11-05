import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated } from 'react-native';

export const AttendanceGrass = ({ 
  lastAttendanceDate, 
  consecutiveAttendance 
}: { 
  lastAttendanceDate?: string | Date | null; 
  consecutiveAttendance?: number | null;
}): JSX.Element => {
  const [selected, setSelected] = useState<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  // 49일(7주) 기준, 오늘을 기준으로 연속 출석일만큼 잔디 표시
  const attendanceArray = Array(49).fill(false);
  const dateArray = Array(49).fill(null);
  
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
  
  const handleGrassPress = (row: number, col: number, dateObj?: Date | null) => {
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

