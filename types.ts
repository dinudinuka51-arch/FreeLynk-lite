
export interface User {
  uid: string;
  dbId?: string; // The UUID from Supabase profiles table
  name: string;
  email: string;
  password?: string;
  profilePhoto: string;
  coverPhoto?: string;
  bio?: string;
  joinedAt: number;
  followers: string[]; // Array of user UIDs
  following: string[]; // Array of user UIDs
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  image?: string;
  timestamp: number;
  likes: number;
  comments: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface ChatPreview {
  userId: string;
  lastMessage: string;
  timestamp: number;
  userName: string;
  userPhoto: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string; // image url
}
