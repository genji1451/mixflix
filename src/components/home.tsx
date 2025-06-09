import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, Play, Check, Star, Calendar, Clock, UserIcon, LogOut } from 'lucide-react';
import { Movie, User, FormData } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtwpxdahrpcscvoaedoe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10d3B4ZGFocnBjc2N2b2FlZG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzU4ODcsImV4cCI6MjA2NTA1MTg4N30.bAwL-mIFHciZHeD-C3ls_tQQ3Vuzd-fC2PodWU5AN4U';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock initial data
const mockMovies: Movie[] = [
  {
    id: 1,
    title: "The Last of Us",
    description: "A post-apocalyptic drama about survival and human connection in a world overrun by infected creatures.",
    type: "series",
    image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=450&fit=crop",
    is_watched: false,
    user_id: 'user-123',
    created_at: '2024-01-15'
  },
  {
    id: 2,
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    type: "movie",
    image_url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300&h=450&fit=crop",
    is_watched: false,
    user_id: 'user-123',
    created_at: '2024-01-10'
  },
  {
    id: 3,
    title: "Oppenheimer",
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    type: "movie",
    image_url: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=450&fit=crop",
    is_watched: true,
    user_id: 'user-123',
    created_at: '2024-01-05'
  }
];

export default function MovieListApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [activeTab, setActiveTab] = useState('watchlist');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'movie',
    image_url: ''
  });
  const [file, setFile] = useState<File | null>(null);

  const loadMovies = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading movies:', error.message);
        return;
      }

      if (data) {
        setMovies(data as Movie[]);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    }
  }, [user]);

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata || {},
          app_metadata: session.user.app_metadata,
          aud: session.user.aud,
          role: session.user.role
        };
        setUser(userData);
        setIsAuthenticated(true);
      }
    };
    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata || {},
          app_metadata: session.user.app_metadata,
          aud: session.user.aud,
          role: session.user.role
        };
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMovies();
    }
  }, [isAuthenticated, user, loadMovies]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('Error signing in with Google:', error.message);
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAddMovie = async () => {
    if (!user || !formData.title.trim()) {
      console.log('User not authenticated or title is empty');
      return;
    }

    let imageUrl = formData.image_url;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('movie-images')
        .upload(fileName, file);

      if (error) {
        alert('Ошибка загрузки изображения');
        return;
      }

      // Получаем публичную ссылку
      const { data: publicUrlData } = supabase
        .storage
        .from('movie-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    try {
      console.log('Adding movie with data:', {
        ...formData,
        image_url: imageUrl,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      const movieData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        image_url: imageUrl,
        is_watched: false,
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('movies')
        .insert([movieData])
        .select()
        .single();

      if (error) {
        console.error('Error adding movie:', error);
        alert('Failed to add movie: ' + error.message);
        return;
      }

      if (data) {
        console.log('Movie added successfully:', data);
        setMovies(prev => [data as Movie, ...prev]);
        setFormData({ title: '', description: '', type: 'movie', image_url: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error in handleAddMovie:', error);
      alert('An unexpected error occurred while adding the movie');
    }
  };

  const toggleWatched = async (movieId: number) => {
    try {
      const movie = movies.find(m => m.id === movieId);
      if (!movie) return;

      const { data, error } = await supabase
        .from('movies')
        .update({ is_watched: !movie.is_watched })
        .eq('id', movieId)
        .select();

      if (error) {
        console.error('Error updating movie:', error.message);
        alert('Failed to update movie: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        setMovies(prev => prev.map(m => m.id === movieId ? data[0] as Movie : m));
      }
    } catch (error) {
      console.error('Error updating movie:', error);
      alert('Unexpected error updating movie');
    }
  };

  const filteredMovies = movies.filter(movie => 
    activeTab === 'watchlist' ? !movie.is_watched : movie.is_watched
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Our Movie List</h1>
            <p className="text-white/70">Movies and shows we want to watch together ❤️</p>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-10 h-10 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Our Movie List</h1>
                <p className="text-sm text-gray-600">Movies and shows we want to watch together ❤️</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user?.user_metadata?.avatar_url && (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs and Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === 'watchlist'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Watchlist ({movies.filter(m => !m.is_watched).length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('watched')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === 'watched'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>Watched ({movies.filter(m => m.is_watched).length})</span>
              </div>
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add New</span>
          </button>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => (
            <div key={movie.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 group">
              <div className="aspect-[3/4] relative overflow-hidden">
                <img
                  src={movie.image_url}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    movie.type === 'movie' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {movie.type === 'movie' ? 'Movie' : 'Series'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{movie.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{movie.description}</p>
                
                <button
                  onClick={() => toggleWatched(movie.id)}
                  className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-105 ${
                    movie.is_watched
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {movie.is_watched ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Watched</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Mark as Watched</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {activeTab === 'watchlist' ? (
                <Clock className="w-8 h-8 text-gray-400" />
              ) : (
                <Check className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'watchlist' ? 'No movies in watchlist' : 'No movies watched yet'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'watchlist' 
                ? 'Add some movies and shows you want to watch together!'
                : 'Movies you\'ve watched will appear here.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Movie Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Movie/Show</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter movie or show title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  rows={3}
                  placeholder="Enter a brief description"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'movie' | 'series' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter image URL or leave empty for default"
                />
                <p className="mt-1 text-sm text-gray-500">If left empty, a default image will be used</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image File (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMovie}
                  disabled={!formData.title.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-2xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Movie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}