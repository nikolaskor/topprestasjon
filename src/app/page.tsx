'use client';

import { useState, useEffect } from 'react';
import { loadProfiles as loadProfilesFromStorage, saveProfile as saveProfileToStorage, subscribeToProfiles } from '@/lib/storage';
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
      setStep('complete');
    }
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

    return profiles
      .filter(p => p.id !== myProfileId)
      .map(p => ({ ...p, matchScore: calculateMatchScore(myProfile, p) }))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  };

  // Render different steps
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl text-center text-white">
          <h1 className="text-5xl font-bold mb-6">🎯 Ditt Topprestasjonsmønster</h1>
          <p className="text-xl mb-8 text-blue-200">
            Oppdag når du presterer best, og finn teammedlemmer som utfyller deg perfekt.
          </p>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold mb-4">Hva skjer?</h2>
            <ol className="space-y-2 text-blue-100">
              <li>1️⃣ Du fyller ut prestasjoner du er stolt av</li>
              <li>2️⃣ Velger dine 3 beste og reflekterer over dem</li>
              <li>3️⃣ Finner dine fellesnevnere og mønster</li>
              <li>4️⃣ Matcher med andre studenter for gruppedannelse!</li>
            </ol>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => setStep('name')}
              className="bg-white text-purple-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-100 transition"
            >
              Start øvelsen →
            </button>
            <button
              onClick={() => setStep('browse')}
              className="bg-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/30 transition"
            >
              Se profiler
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Hva heter du?</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ditt navn..."
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg focus:border-purple-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => name.trim() && setStep('achievements')}
            disabled={!name.trim()}
            className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            Neste →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'achievements') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Del 1: Prestasjoner du er stolt av</h2>
            <p className="text-gray-600 mb-6">
              Tenk tilbake på prestasjoner der du opplevde at du lyktes med en oppgave eller aktivitet.
            </p>
            
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full transition ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={addAchievement}
                className="bg-purple-600 text-white px-6 rounded-xl font-bold hover:bg-purple-700 transition"
              >
                + Legg til
              </button>
            </div>

            {/* Achievement list */}
            <div className="space-y-2 mb-6">
              {achievements.map(ach => {
                const cat = CATEGORIES.find(c => c.id === ach.category);
                return (
                  <div key={ach.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span>{cat?.emoji}</span>
                    <span className="flex-1">{ach.description}</span>
                    <button
                      onClick={() => setAchievements(achievements.filter(a => a.id !== ach.id))}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {achievements.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                Legg til minst 3 prestasjoner for å fortsette
              </p>
            )}
          </div>

          <button
            onClick={() => setStep('top-three')}
            disabled={achievements.length < 3}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            Velg mine 3 beste →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'top-three') {
    if (topThree.length < 3) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Del 2: Velg dine 3 viktigste</h2>
              <p className="text-gray-600 mb-6">
                Valgt: {topThree.length}/3
              </p>
              
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
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">{cat?.emoji}</span>
                      <span className="flex-1">{ach.description}</span>
                      {isSelected && <span className="text-purple-600 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Answer questions for each top achievement
    const currentTop = topThree[currentTopIndex];
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-purple-600 font-medium">
                Prestasjon {currentTopIndex + 1} av 3
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i <= currentTopIndex ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-6">{currentTop.title}</h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {ACHIEVEMENT_QUESTIONS.map(q => (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {q.label}
                  </label>
                  <textarea
                    value={currentTop.answers[q.key as keyof typeof currentTop.answers]}
                    onChange={(e) => updateTopAnswer(currentTopIndex, q.key, e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
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
              className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition"
            >
              {currentTopIndex < 2 ? 'Neste prestasjon →' : 'Finn fellesnevnere →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'denominators') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Del 3: Fellesnevnere</h2>
            <p className="text-gray-600 mb-6">
              Se gjennom dine tre historier. Hva går igjen? Hva er felles for alle prestasjonene dine?
            </p>
            
            <div className="space-y-3">
              {commonDenominators.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-purple-600">→</span>
                  <input
                    type="text"
                    value={d}
                    onChange={(e) => {
                      const updated = [...commonDenominators];
                      updated[i] = e.target.value;
                      setCommonDenominators(updated);
                    }}
                    placeholder={`Fellesnevner ${i + 1}...`}
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('pattern')}
              className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition"
            >
              Oppsummer mønsteret →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pattern') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Del 4: Ditt topprestasjonsmønster</h2>
            <p className="text-gray-600 mb-6">
              Basert på fellesnevnerne - hva er din personlige suksessoppskrift? Hvordan går du frem for å prestere på ditt beste?
            </p>
            
            <div className="space-y-3">
              {performancePattern.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-purple-600">→</span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const updated = [...performancePattern];
                      updated[i] = e.target.value;
                      setPerformancePattern(updated);
                    }}
                    placeholder={`Del av mønsteret...`}
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full mt-6 bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition"
            >
              ✓ Fullfør og lagre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4">
        <div className="max-w-md text-center text-white">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-4">Profilen din er lagret!</h1>
          <p className="text-green-100 mb-8">
            Nå kan du se andres profiler og finne potensielle teammedlemmer.
          </p>
          <button
            onClick={() => setStep('browse')}
            className="bg-white text-green-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-green-100 transition"
          >
            Se alle profiler →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'browse') {
    const matchedProfiles = getMatchedProfiles();
    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const myProfileId = localStorage.getItem('topprestasjon_profile_id');

    if (selectedProfile) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedProfileId(null)}
              className="mb-4 text-purple-600 hover:text-purple-800 font-medium"
            >
              ← Tilbake til oversikt
            </button>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {selectedProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedProfile.name}</h2>
                  {(selectedProfile as Profile & { matchScore?: number }).matchScore !== undefined && (
                    <span className="text-purple-600 font-medium">
                      {(selectedProfile as Profile & { matchScore?: number }).matchScore}% match
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-2">Kategorier</h3>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(selectedProfile.achievements.map(a => a.category))].map(cat => {
                    const catInfo = CATEGORIES.find(c => c.id === cat);
                    return (
                      <span key={cat} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {catInfo?.emoji} {catInfo?.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {selectedProfile.commonDenominators.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-700 mb-2">Fellesnevnere</h3>
                  <ul className="space-y-1">
                    {selectedProfile.commonDenominators.map((d, i) => (
                      <li key={i} className="text-gray-600">→ {d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedProfile.performancePattern.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-700 mb-2">Topprestasjonsmønster</h3>
                  <ul className="space-y-1">
                    {selectedProfile.performancePattern.map((p, i) => (
                      <li key={i} className="text-gray-600">→ {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-700 mb-2">Topp 3 prestasjoner</h3>
                <div className="space-y-2">
                  {selectedProfile.topThree.map((t, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl">
                      <span className="font-medium">{i + 1}. {t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">👥 Alle profiler</h1>
            {!myProfileId && (
              <button
                onClick={() => setStep('name')}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-700 transition"
              >
                + Opprett din profil
              </button>
            )}
          </div>

          {profiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl mb-4">Ingen profiler ennå</p>
              <p>Vær den første til å opprette en!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {matchedProfiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{profile.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...new Set(profile.achievements.map(a => a.category))].slice(0, 3).map(cat => {
                          const catInfo = CATEGORIES.find(c => c.id === cat);
                          return <span key={cat}>{catInfo?.emoji}</span>;
                        })}
                      </div>
                    </div>
                    {(profile as Profile & { matchScore?: number }).matchScore !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          {(profile as Profile & { matchScore?: number }).matchScore}%
                        </div>
                        <div className="text-xs text-gray-500">match</div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
