import { supabase, isSupabaseConfigured } from './supabase';
import { Profile } from '@/types';

const STORAGE_KEY = 'topprestasjon_profiles';

// Fallback to localStorage when Supabase is not configured
const getLocalProfiles = (): Profile[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveLocalProfile = (profile: Profile) => {
  const profiles = getLocalProfiles();
  profiles.unshift(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
};

export const loadProfiles = async (): Promise<Profile[]> => {
  if (!isSupabaseConfigured()) {
    return getLocalProfiles();
  }

  const { data } = await supabase!
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (data) {
    return data.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      achievements: p.achievements || [],
      topThree: p.top_three || [],
      commonDenominators: p.common_denominators || [],
      performancePattern: p.performance_pattern || [],
    }));
  }
  return [];
};

export const saveProfile = async (profile: Profile): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    saveLocalProfile(profile);
    return true;
  }

  const { error } = await supabase!.from('profiles').insert({
    id: profile.id,
    name: profile.name,
    created_at: profile.createdAt,
    achievements: profile.achievements,
    top_three: profile.topThree,
    common_denominators: profile.commonDenominators,
    performance_pattern: profile.performancePattern,
  });

  return !error;
};

export const updateProfile = async (profile: Profile): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    // Update in localStorage
    const profiles = getLocalProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      profiles[index] = profile;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      return true;
    }
    return false;
  }

  const { error } = await supabase!.from('profiles').update({
    name: profile.name,
    achievements: profile.achievements,
    top_three: profile.topThree,
    common_denominators: profile.commonDenominators,
    performance_pattern: profile.performancePattern,
  }).eq('id', profile.id);

  return !error;
};

export const subscribeToProfiles = (callback: () => void) => {
  if (!isSupabaseConfigured()) {
    // For localStorage, we use storage events
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  const channel = supabase!
    .channel('profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
};
