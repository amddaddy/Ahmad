
export interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  isSynced?: boolean;
}

export type VocabularyCategory = 'General' | 'Food & Dining' | 'Travel' | 'Technology' | 'At Home';