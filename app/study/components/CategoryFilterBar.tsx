import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Category } from '../types';

interface CategoryFilterBarProps {
  categoryList: Category[];
  selectedCategory: string | number;
  onSelectCategory: (id: string | number) => void;
  styles: any;
}

export const CategoryFilterBar = ({ 
  categoryList, 
  selectedCategory, 
  onSelectCategory,
  styles 
}: CategoryFilterBarProps): JSX.Element => (
  <View style={{ backgroundColor: '#fff', paddingVertical: 4 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 0, marginBottom: 8 }}>
      <TouchableOpacity
        style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonSelected]}
        onPress={() => onSelectCategory('all')}
      >
        <Text style={[styles.categoryButtonText, selectedCategory === 'all' && styles.categoryButtonTextSelected]}>전체</Text>
      </TouchableOpacity>
      {categoryList && categoryList.length > 0 ? (
        categoryList.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonSelected]}
            onPress={() => onSelectCategory(cat.id)}
          >
            <Text style={[styles.categoryButtonText, selectedCategory === cat.id && styles.categoryButtonTextSelected]}>{cat.name}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <View style={{ padding: 10 }}>
          <Text style={{ color: '#999', fontSize: 14 }}>카테고리 로딩 중...</Text>
        </View>
      )}
    </ScrollView>
  </View>
);

