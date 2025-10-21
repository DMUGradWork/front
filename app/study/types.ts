export type ActiveScreen = 'list' | 'chat' | 'community' | 'create';

export type ActiveChat = {
  chatRoomId: number | null;
  studyName: string;
  imageUrl?: string;
  studyRoomId: number | null;
  studyRoomHostId: number | null;
};

export type ParticipantCounts = Record<number, number>;

export type Category = { id: string | number; name: string };

export type StudyRoom = {
  id: number;
  name: string;
  chatId?: number;
  imageUrl?: string;
  studyRoomHostId?: number;
  lastMsg?: any;
};

export type Meeting = {
  id: number;
  title: string;
  meetingTime?: string;
  duration?: number;
  studyRoomName?: string;
};

