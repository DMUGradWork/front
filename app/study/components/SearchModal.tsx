import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, TextInput } from 'react-native';
import { StudyRoom } from '../types';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (filtered: StudyRoom[]) => void;
  studyList: StudyRoom[];
  styles: any;
}

export const SearchModal = ({ 
  visible, 
  onClose, 
  onSearch,
  studyList,
  styles 
}: SearchModalProps): JSX.Element => {
  const [localSearch, setLocalSearch] = useState({ type: 'title', text: '' });

  const handleLocalSearch = () => {
    if (!localSearch.text.trim()) {
      onSearch(studyList);
      onClose();
      return;
    }

    const searchQuery = localSearch.text.toLowerCase().trim();
    const filtered = (Array.isArray(studyList) ? studyList : []).filter(study => {
      if (localSearch.type === 'title') {
        return study?.name && study.name.toLowerCase().includes(searchQuery);
      } else {
        return study?.hostName && study.hostName.toLowerCase().includes(searchQuery);
      }
    });

    onSearch(filtered);
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.centerModalContent, styles.searchModalContent]}>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={localSearch.type === 'title' ? "스터디방 제목을 입력하세요" : "방장 이름을 입력하세요"}
                    value={localSearch.text}
                    onChangeText={(text) => setLocalSearch({...localSearch, text})}
                    returnKeyType="search"
                    onSubmitEditing={handleLocalSearch}
                  />
                  <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleLocalSearch}
                  >
                    <Text style={styles.searchButtonText}>검색</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

