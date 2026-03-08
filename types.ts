
export type Page = 'home' | 'about' | 'services' | 'requests' | 'members' | 'forum' | 'blog' | 'testimonials' | 'profile' | 'moderation' | 'profile-view';

export interface User {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  whatsapp: string;
  gender: 'Homme' | 'Femme';
  country: string;
  bio?: string;
  offeredSkills: string[];
  requestedSkills: string[];
  availability: string;
  languages: string[];
  hobbies: string[];
  credits: number;
  createdAt: string;
  avatar: string; 
  coverPhoto?: string;
  role: 'user' | 'moderator' | 'admin';
  termsAccepted: boolean;
  isVerifiedEmail: boolean;
  isVerifiedSMS: boolean;
  status: 'active' | 'deactivated' | 'deleted';
  lastActive?: string;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

export interface BlogComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  category: string;
  media: MediaItem[];
  externalLink?: string;
  likes: string[]; // User IDs
  dislikes: string[]; // User IDs
  reposts: number;
  shares: number;
  comments: BlogComment[];
  createdAt: string;
}

export interface Testimonial {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  rating: number;
  media?: MediaItem[];
  votes: string[]; // User IDs who voted (legacy)
  likes?: string[]; // User IDs
  shares?: number;
  comments?: BlogComment[];
  createdAt: string;
}

export interface ForumTopic {
  id: string;
  authorId?: string;
  title: string;
  authorName: string;
  authorAvatar?: string;
  message: string;
  media?: MediaItem[];
  externalLink?: string;
  likes?: string[]; // User IDs
  shares?: number;
  comments?: BlogComment[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  serviceTitle: string;
  type: 'service' | 'request';
  date: string;
}

export interface Service {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  creditCost: number;
  category: string;
  createdAt: string;
  status: 'proposed' | 'accepted' | 'cancelled' | 'in-progress';
  acceptedBy?: string;
  acceptedAt?: string;
}

export interface Request {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  creditOffer: number;
  category: string;
  createdAt: string;
  status: 'proposed' | 'accepted' | 'cancelled' | 'in-progress';
  fulfilledBy?: string;
  fulfilledAt?: string;
}

export interface Connection {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'sent' | 'accepted' | 'refused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}
