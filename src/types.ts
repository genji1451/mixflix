export interface Movie {
  id: number;
  title: string;
  description: string;
  type: 'movie' | 'series';
  image_url: string;
  is_watched: boolean;
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  app_metadata?: {
    [key: string]: any;
  };
  aud?: string;
  role?: string;
}

export interface FormData {
  title: string;
  description: string;
  type: 'movie' | 'series';
  image_url: string;
} 