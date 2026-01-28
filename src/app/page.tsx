'use client';

import { useState, useEffect } from 'react';
import { loadProfiles as loadProfilesFromStorage, saveProfile as saveProfileToStorage, updateProfile as updateProfileToStorage, subscribeToProfiles } from '@/lib/storage';
import { Profile, Achievement, TopAchievement, CATEGORIES, ACHIEVEMENT_QUESTIONS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type Step = 'welcome' | 'name' | 'achievements' | 'top-three' | 'denominators' | 'pattern' | 'complete' | 'browse';

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [topThree, setTopThree] = useState<TopAchievement[]>([]);
  const [commonDenominators, setCommonDenominators] = useState<string[]>(['', '', '', '', '']);
  const [performancePattern, setPerformancePattern] = useState<string[]>(['', '', '', '', '']);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('studier');
  const [newAchievement, setNewAchievement] = useState('');
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCommonDenominators, setEditCommonDenominators] = useState<string[]>([]);
  const [editPerformancePattern, setEditPerformancePattern] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    fetchProfiles();
    
    // Check for existing session
    const savedProfileId = localStorage.getItem('topprestasjon_profile_id');
    if (savedProfileId) {
      setStep('browse');
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToProfiles(() => {
      fetchProfiles();
    });
    return unsubscribe;
  }, []);

  const fetchProfiles = async () => {
    const data = await loadProfilesFromStorage();
    setProfiles(data);
  };

  const handleSaveProfile = async () => {
    const profile: Profile = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      achievements,
      topThree,
      commonDenominators: commonDenominators.filter(d => d.trim()),
      performancePattern: performancePattern.filter(p => p.trim()),
    };

    const success = await saveProfileToStorage(profile);

    if (success) {
      localStorage.setItem('topprestasjon_profile_id', profile.id);
      setCurrentProfile(profile);
      // Refresh profiles immediately so the new profile appears
      await fetchProfiles();
      setStep('complete');
    }
  };

  const startEditing = (profile: Profile) => {
    setEditName(profile.name);
    setEditCommonDenominators([...profile.commonDenominators, '', '', '', '', ''].slice(0, 5));
    setEditPerformancePattern([...profile.performancePattern, '', '', '', '', ''].slice(0, 5));
    setIsEditing(true);
  };

  const handleUpdateProfile = async (profile: Profile) => {
    setIsSaving(true);
    const updatedProfile: Profile = {
      ...profile,
      name: editName,
      commonDenominators: editCommonDenominators.filter(d => d.trim()),
      performancePattern: editPerformancePattern.filter(p => p.trim()),
    };

    const success = await updateProfileToStorage(updatedProfile);

    if (success) {
      await fetchProfiles();
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const addAchievement = () => {
    if (newAchievement.trim()) {
      setAchievements([...achievements, {
        id: uuidv4(),
        category: selectedCategory as Achievement['category'],
        description: newAchievement.trim(),
      }]);
      setNewAchievement('');
    }
  };

  const selectTopAchievement = (achievement: Achievement) => {
    if (topThree.length < 3 && !topThree.find(t => t.id === achievement.id)) {
      setTopThree([...topThree, {
        id: achievement.id,
        title: achievement.description,
        answers: {
          whatWasIt: '',
          whyYou: '',
          thoughtsAndFeelings: '',
          howPrepared: '',
          howWorked: '',
          feelingsDuring: '',
          handledResistance: '',
          othersInvolved: '',
          result: '',
          reward: '',
          feelingsAfter: '',
        },
      }]);
    }
  };

  const updateTopAnswer = (index: number, key: string, value: string) => {
    const updated = [...topThree];
    updated[index] = {
      ...updated[index],
      answers: { ...updated[index].answers, [key]: value },
    };
    setTopThree(updated);
  };

  const calculateMatchScore = (profile1: Profile, profile2: Profile): number => {
    // Simple matching based on common denominators and patterns
    let score = 0;
    const p1Patterns = [...profile1.commonDenominators, ...profile1.performancePattern].map(s => s.toLowerCase());
    const p2Patterns = [...profile2.commonDenominators, ...profile2.performancePattern].map(s => s.toLowerCase());
    
    // Check for complementary categories
    const p1Categories = new Set(profile1.achievements.map(a => a.category));
    const p2Categories = new Set(profile2.achievements.map(a => a.category));
    const differentCategories = [...p1Categories].filter(c => !p2Categories.has(c)).length;
    score += differentCategories * 10;

    // Check for similar keywords
    const keywords = ['team', 'alene', 'struktur', 'kreativ', 'deadline', 'planlegging', 'spontan', 'fokus', 'sosial'];
    keywords.forEach(kw => {
      const p1Has = p1Patterns.some(p => p.includes(kw));
      const p2Has = p2Patterns.some(p => p.includes(kw));
      if (p1Has && p2Has) score += 5;  // Similar
      if (p1Has !== p2Has) score += 8; // Complementary
    });

    return Math.min(100, score);
  };

  const getMatchedProfiles = () => {
    const myProfileId = localStorage.getItem('topprestasjon_profile_id');
    const myProfile = profiles.find(p => p.id === myProfileId);
    
    if (!myProfile) return profiles;

    // Get other profiles with match scores
    const otherProfiles = profiles
      .filter(p => p.id !== myProfileId)
      .map(p => ({ ...p, matchScore: calculateMatchScore(myProfile, p), isOwnProfile: false }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // Add own profile at the beginning with special flag
    return [{ ...myProfile, isOwnProfile: true }, ...otherProfiles];
  };

  // USN Header component
  const USNHeader = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#6B2D8B]/10 px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B2D8B] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">USN</span>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-[#1E3A5F]">PRO1000</div>
            <div className="text-[#6B2D8B] text-xs">Topprestasjonsmønster</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Universitetet i Sørøst-Norge
        </div>
      </div>
    </div>
  );

  // Render different steps
  if (step === 'welcome') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center p-4 pt-20">
          <div className="max-w-2xl text-center text-white">
            {/* USN Logo area */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm">
                <span className="font-semibold">PRO1000</span>
                <span className="text-white/60">|</span>
                <span className="text-white/80">Universitetet i Sørøst-Norge</span>
              </div>
            </div>
            
            <h1 className="text-5xl font-serif font-normal mb-6">
              Ditt Topprestasjonsmønster
            </h1>
            <p className="text-xl mb-8 text-white/80">
              Oppdag når du presterer best, og finn teammedlemmer som utfyller deg perfekt.
            </p>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 text-left border border-white/20">
              <h2 className="text-lg font-semibold mb-4 font-serif">Hva skjer?</h2>
              <ol className="space-y-3 text-white/90">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span>Du fyller ut prestasjoner du er stolt av</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span>Velger dine 3 beste og reflekterer over dem</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span>Finner dine fellesnevnere og mønster</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <span>Matcher med andre studenter for gruppedannelse!</span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setStep('name')}
                className="bg-[#FF6B35] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#FF8255] transition shadow-lg hover:shadow-xl"
              >
                Start øvelsen →
              </button>
              <button
                onClick={() => setStep('browse')}
                className="bg-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/30 transition border border-white/30"
              >
                Se profiler
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === 'name') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#E8D8F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-serif text-[#1E3A5F] mb-2">Hva heter du?</h2>
              <p className="text-gray-500 text-sm">Dette brukes til å identifisere profilen din</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt navn..."
              className="w-full p-4 border-2 border-[#E8D8F0] rounded-xl text-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            <button
              onClick={() => name.trim() && setStep('achievements')}
              disabled={!name.trim()}
              className="w-full mt-6 bg-[#6B2D8B] text-white py-4 rounded-full font-bold text-lg hover:bg-[#8B4DAB] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Neste →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === 'achievements') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 border border-[#E8D8F0]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <h2 className="text-2xl font-serif text-[#1E3A5F]">Prestasjoner du er stolt av</h2>
                  <p className="text-gray-500 text-sm">Tenk tilbake på situasjoner der du lyktes med en oppgave eller aktivitet</p>
                </div>
              </div>
              
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full transition font-medium ${
                      selectedCategory === cat.id
                        ? 'bg-[#6B2D8B] text-white'
                        : 'bg-[#E8D8F0] text-[#6B2D8B] hover:bg-[#d4c4e0]'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              {/* Add achievement */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAchievement()}
                  placeholder="Beskriv en prestasjon..."
                  className="flex-1 p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
                />
                <button
                  onClick={addAchievement}
                  className="bg-[#FF6B35] text-white px-6 rounded-xl font-bold hover:bg-[#FF8255] transition"
                >
                  + Legg til
                </button>
              </div>

              {/* Achievement list */}
              <div className="space-y-2 mb-6">
                {achievements.map(ach => {
                  const cat = CATEGORIES.find(c => c.id === ach.category);
                  return (
                    <div key={ach.id} className="flex items-center gap-3 p-3 bg-[#F5F0E8] rounded-xl border border-[#E8D8F0]">
                      <span className="text-xl">{cat?.emoji}</span>
                      <span className="flex-1 text-[#1E3A5F]">{ach.description}</span>
                      <button
                        onClick={() => setAchievements(achievements.filter(a => a.id !== ach.id))}
                        className="text-red-400 hover:text-red-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {achievements.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Legg til minst 3 prestasjoner for å fortsette</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('top-three')}
              disabled={achievements.length < 3}
              className="w-full bg-[#6B2D8B] text-white py-4 rounded-full font-bold text-lg hover:bg-[#8B4DAB] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Velg mine 3 beste →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === 'top-three') {
    if (topThree.length < 3) {
      return (
        <>
          <USNHeader />
          <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 border border-[#E8D8F0]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold">2</div>
                  <div>
                    <h2 className="text-2xl font-serif text-[#1E3A5F]">Velg dine 3 viktigste</h2>
                    <p className="text-[#6B2D8B] font-medium">Valgt: {topThree.length}/3</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {achievements.map(ach => {
                    const cat = CATEGORIES.find(c => c.id === ach.category);
                    const isSelected = topThree.find(t => t.id === ach.id);
                    return (
                      <button
                        key={ach.id}
                        onClick={() => selectTopAchievement(ach)}
                        disabled={!!isSelected}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition text-left ${
                          isSelected
                            ? 'bg-[#E8D8F0] border-2 border-[#6B2D8B]'
                            : 'bg-[#F5F0E8] hover:bg-[#E8D8F0] border-2 border-transparent'
                        }`}
                      >
                        <span className="text-2xl">{cat?.emoji}</span>
                        <span className="flex-1 text-[#1E3A5F]">{ach.description}</span>
                        {isSelected && <span className="text-[#6B2D8B] font-bold text-xl">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Answer questions for each top achievement
    const currentTop = topThree[currentTopIndex];
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#6B2D8B] font-medium bg-[#E8D8F0] px-3 py-1 rounded-full">
                  Prestasjon {currentTopIndex + 1} av 3
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition ${
                        i <= currentTopIndex ? 'bg-[#6B2D8B]' : 'bg-[#E8D8F0]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <h2 className="text-xl font-serif text-[#1E3A5F] mb-6 pb-4 border-b border-[#E8D8F0]">{currentTop.title}</h2>
              
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                {ACHIEVEMENT_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-1">
                      {q.label}
                    </label>
                    <textarea
                      value={currentTop.answers[q.key as keyof typeof currentTop.answers]}
                      onChange={(e) => updateTopAnswer(currentTopIndex, q.key, e.target.value)}
                      className="w-full p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none resize-none transition"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (currentTopIndex < 2) {
                    setCurrentTopIndex(currentTopIndex + 1);
                  } else {
                    setStep('denominators');
                  }
                }}
                className="w-full mt-6 bg-[#6B2D8B] text-white py-4 rounded-full font-bold text-lg hover:bg-[#8B4DAB] transition"
              >
                {currentTopIndex < 2 ? 'Neste prestasjon →' : 'Finn fellesnevnere →'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === 'denominators') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <h2 className="text-2xl font-serif text-[#1E3A5F]">Fellesnevnere</h2>
                  <p className="text-gray-500 text-sm">Hva går igjen i alle prestasjonene dine?</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {commonDenominators.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#FF6B35] font-bold">→</span>
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => {
                        const updated = [...commonDenominators];
                        updated[i] = e.target.value;
                        setCommonDenominators(updated);
                      }}
                      placeholder={`Fellesnevner ${i + 1}...`}
                      className="flex-1 p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('pattern')}
                className="w-full mt-6 bg-[#6B2D8B] text-white py-4 rounded-full font-bold text-lg hover:bg-[#8B4DAB] transition"
              >
                Oppsummer mønsteret →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === 'pattern') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold">4</div>
                <div>
                  <h2 className="text-2xl font-serif text-[#1E3A5F]">Ditt topprestasjonsmønster</h2>
                  <p className="text-gray-500 text-sm">Hva er din personlige suksessoppskrift?</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {performancePattern.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#FF6B35] font-bold">→</span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const updated = [...performancePattern];
                        updated[i] = e.target.value;
                        setPerformancePattern(updated);
                      }}
                      placeholder={`Del av mønsteret...`}
                      className="flex-1 p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full mt-6 bg-[#FF6B35] text-white py-4 rounded-full font-bold text-lg hover:bg-[#FF8255] transition shadow-lg"
              >
                ✓ Fullfør og lagre
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (step === 'complete') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-gradient-to-br from-[#6B2D8B] via-[#8B4DAB] to-[#FF6B35] flex items-center justify-center p-4 pt-20">
          <div className="max-w-md text-center text-white">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎉</span>
            </div>
            <h1 className="text-3xl font-serif mb-4">Profilen din er lagret!</h1>
            <p className="text-white/80 mb-8">
              Nå kan du se andres profiler og finne potensielle teammedlemmer.
            </p>
            <button
              onClick={() => setStep('browse')}
              className="bg-white text-[#6B2D8B] px-8 py-4 rounded-full font-bold text-lg hover:bg-[#E8D8F0] transition shadow-lg"
            >
              Se alle profiler →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === 'browse') {
    const matchedProfiles = getMatchedProfiles();
    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const myProfileId = localStorage.getItem('topprestasjon_profile_id');
    const isOwnProfile = selectedProfile && selectedProfile.id === myProfileId;

    if (selectedProfile) {
      return (
        <>
          <USNHeader />
          <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => { setSelectedProfileId(null); setIsEditing(false); }}
                className="mb-4 text-[#6B2D8B] hover:text-[#8B4DAB] font-medium flex items-center gap-2 transition"
              >
                <span>←</span> Tilbake til oversikt
              </button>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#E8D8F0]">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ${isOwnProfile ? 'bg-gradient-to-br from-[#FF6B35] to-[#FFB347] ring-4 ring-[#FF6B35]/30' : 'bg-gradient-to-br from-[#6B2D8B] to-[#FF6B35]'}`}>
                    {selectedProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-2xl font-serif text-[#1E3A5F] border-2 border-[#E8D8F0] rounded-lg px-2 py-1 w-full focus:border-[#6B2D8B] focus:outline-none text-gray-900 placeholder:text-gray-400"
                      />
                    ) : (
                      <h2 className="text-2xl font-serif text-[#1E3A5F]">{selectedProfile.name}</h2>
                    )}
                    {isOwnProfile && !isEditing && (
                      <span className="inline-flex items-center gap-1 text-[#FF6B35] font-medium bg-[#FF6B35]/10 px-3 py-1 rounded-full text-sm mt-1">
                        Din profil
                      </span>
                    )}
                    {!isOwnProfile && (selectedProfile as Profile & { matchScore?: number }).matchScore !== undefined && (
                      <span className="inline-flex items-center gap-1 text-[#6B2D8B] font-medium bg-[#E8D8F0] px-3 py-1 rounded-full text-sm mt-1">
                        <span className="w-2 h-2 bg-[#FF6B35] rounded-full"></span>
                        {(selectedProfile as Profile & { matchScore?: number }).matchScore}% match
                      </span>
                    )}
                  </div>
                  {isOwnProfile && !isEditing && (
                    <button
                      onClick={() => startEditing(selectedProfile)}
                      className="bg-[#6B2D8B] text-white px-4 py-2 rounded-full font-medium hover:bg-[#8B4DAB] transition flex items-center gap-2"
                    >
                      ✏️ Rediger
                    </button>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Kategorier</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(selectedProfile.achievements.map(a => a.category))].map(cat => {
                      const catInfo = CATEGORIES.find(c => c.id === cat);
                      return (
                        <span key={cat} className="px-3 py-1 bg-[#E8D8F0] text-[#6B2D8B] rounded-full text-sm font-medium">
                          {catInfo?.emoji} {catInfo?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="mb-6">
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Fellesnevnere</h3>
                      <div className="space-y-2">
                        {editCommonDenominators.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#FF6B35]">→</span>
                            <input
                              type="text"
                              value={d}
                              onChange={(e) => {
                                const updated = [...editCommonDenominators];
                                updated[i] = e.target.value;
                                setEditCommonDenominators(updated);
                              }}
                              placeholder={`Fellesnevner ${i + 1}...`}
                              className="flex-1 p-2 border-2 border-[#E8D8F0] rounded-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Topprestasjonsmønster</h3>
                      <div className="space-y-2">
                        {editPerformancePattern.map((p, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#FF6B35]">→</span>
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => {
                                const updated = [...editPerformancePattern];
                                updated[i] = e.target.value;
                                setEditPerformancePattern(updated);
                              }}
                              placeholder={`Del av mønsteret...`}
                              className="flex-1 p-2 border-2 border-[#E8D8F0] rounded-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full font-bold hover:bg-gray-300 transition"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={() => handleUpdateProfile(selectedProfile)}
                        disabled={isSaving}
                        className="flex-1 bg-[#FF6B35] text-white py-3 rounded-full font-bold hover:bg-[#FF8255] transition disabled:opacity-50"
                      >
                        {isSaving ? 'Lagrer...' : '✓ Lagre endringer'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedProfile.commonDenominators.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Fellesnevnere</h3>
                        <ul className="space-y-1">
                          {selectedProfile.commonDenominators.map((d, i) => (
                            <li key={i} className="text-gray-600 flex items-center gap-2">
                              <span className="text-[#FF6B35]">→</span> {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedProfile.performancePattern.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Topprestasjonsmønster</h3>
                        <ul className="space-y-1">
                          {selectedProfile.performancePattern.map((p, i) => (
                            <li key={i} className="text-gray-600 flex items-center gap-2">
                              <span className="text-[#FF6B35]">→</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif">Topp 3 prestasjoner</h3>
                      <div className="space-y-2">
                        {selectedProfile.topThree.map((t, i) => (
                          <div key={i} className="p-3 bg-[#F5F0E8] rounded-xl border border-[#E8D8F0]">
                            <span className="font-medium text-[#1E3A5F]">{i + 1}. {t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] p-4 pt-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-serif text-[#1E3A5F]">Alle profiler</h1>
                <p className="text-gray-500 text-sm">Finn teammedlemmer som utfyller deg</p>
              </div>
              {!myProfileId && (
                <button
                  onClick={() => setStep('name')}
                  className="bg-[#6B2D8B] text-white px-4 py-2 rounded-full font-medium hover:bg-[#8B4DAB] transition"
                >
                  + Opprett din profil
                </button>
              )}
            </div>

            {profiles.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-[#E8D8F0]">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-xl mb-2 font-serif text-[#1E3A5F]">Ingen profiler ennå</p>
                <p className="text-gray-400">Vær den første til å opprette en!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {matchedProfiles.map(profile => {
                  const isOwn = (profile as Profile & { isOwnProfile?: boolean }).isOwnProfile;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`p-4 rounded-xl shadow-sm hover:shadow-md transition text-left ${
                        isOwn 
                          ? 'bg-gradient-to-br from-[#FF6B35]/10 to-[#FFB347]/10 border-2 border-[#FF6B35] hover:border-[#FF8255]' 
                          : 'bg-white border border-[#E8D8F0] hover:border-[#6B2D8B]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow ${
                          isOwn 
                            ? 'bg-gradient-to-br from-[#FF6B35] to-[#FFB347]' 
                            : 'bg-gradient-to-br from-[#6B2D8B] to-[#FF6B35]'
                        }`}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[#1E3A5F]">{profile.name}</h3>
                            {isOwn && (
                              <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full">Du</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[...new Set(profile.achievements.map(a => a.category))].slice(0, 3).map(cat => {
                              const catInfo = CATEGORIES.find(c => c.id === cat);
                              return <span key={cat} className="text-lg">{catInfo?.emoji}</span>;
                            })}
                          </div>
                        </div>
                        {!isOwn && (profile as Profile & { matchScore?: number }).matchScore !== undefined && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#6B2D8B]">
                              {(profile as Profile & { matchScore?: number }).matchScore}%
                            </div>
                            <div className="text-xs text-gray-500">match</div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
}
