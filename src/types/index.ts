export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
  accent_color: string | null;
  onboarded_at: string | null;
  created_at: string;
}

export interface TradeProposal {
  id: string;
  match_id: string;
  proposer_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
}

export interface Achievement {
  id: string;
  user_id: string;
  type: string;
  earned_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: 'clothes' | 'shoes' | 'gadgets' | 'accessories' | 'other';
  condition: 'new' | 'like_new' | 'good' | 'fair';
  images: string[];
  is_available: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  item1_id: string;
  item2_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
  other_profile?: Profile;
  other_item?: Item;
  my_item?: Item;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Discover: undefined;
  Matches: undefined;
  AddItem: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Chat: { matchId: string; matchedUser: Profile };
  ItemDetail: { itemId: string };
  Onboarding: undefined;
};
