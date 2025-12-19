
export interface User {
  uid: string;
  dbId?: string;
  name: string;
  email: string;
  password?: string;
  profilePhoto: string;
  coverPhoto?: string;
  bio?: string;
  joinedAt: number;
  followers: string[];
  following: string[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    name: string;
    profile_photo: string;
    uid: string;
  };
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image?: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  profiles?: {
    id: string;
    name: string;
    profile_photo: string;
    uid: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text?: string;
  media_url?: string;
  media_type?: 'text' | 'image' | 'audio';
  created_at: string;
}

export interface Story {
  id: string;
  author_id: string;
  media_url: string;
  created_at: string;
  profiles?: {
    name: string;
    profile_photo: string;
    uid: string;
  };
}
