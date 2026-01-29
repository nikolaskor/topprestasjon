'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { loadProfiles as loadProfilesFromStorage, saveProfile as saveProfileToStorage, updateProfile as updateProfileToStorage, subscribeToProfiles } from '@/lib/storage';
import { Profile, Achievement, TopAchievement, CATEGORIES, ACHIEVEMENT_QUESTIONS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type Step = 'welcome' | 'name' | 'achievements' | 'top-three' | 'denominators' | 'pattern' | 'complete' | 'browse';

export default function Home() {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
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
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [editGroupNumber, setEditGroupNumber] = useState('');

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
      groupNumber: groupNumber.trim() || undefined,
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
    setEditGroupNumber(profile.groupNumber || '');
    setEditCommonDenominators([...profile.commonDenominators, '', '', '', '', ''].slice(0, 5));
    setEditPerformancePattern([...profile.performancePattern, '', '', '', '', ''].slice(0, 5));
    setIsEditing(true);
  };

  const handleUpdateProfile = async (profile: Profile) => {
    setIsSaving(true);
    const updatedProfile: Profile = {
      ...profile,
      name: editName,
      groupNumber: editGroupNumber.trim() || undefined,
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

  const getGroupProfiles = () => {
    const myProfileId = localStorage.getItem('topprestasjon_profile_id');
    const myProfile = profiles.find(p => p.id === myProfileId);
    
    let result = profiles.map(p => ({
      ...p,
      isOwnProfile: p.id === myProfileId,
    }));

    // Sort: own profile first, then by group number, then by name
    result.sort((a, b) => {
      if (a.isOwnProfile) return -1;
      if (b.isOwnProfile) return 1;
      const groupA = a.groupNumber || '';
      const groupB = b.groupNumber || '';
      if (groupA !== groupB) return groupA.localeCompare(groupB, 'no', { numeric: true });
      return a.name.localeCompare(b.name, 'no');
    });

    return result;
  };

  const getAvailableGroups = () => {
    const groups = new Set(profiles.map(p => p.groupNumber).filter(Boolean));
    return [...groups].sort((a, b) => (a || '').localeCompare(b || '', 'no', { numeric: true }));
  };

  const getGroupOverview = (groupNum: string) => {
    const groupProfiles = profiles.filter(p => p.groupNumber === groupNum);
    
    // Collect all categories across the group
    const categoryCount: Record<string, number> = {};
    groupProfiles.forEach(p => {
      const cats = new Set(p.achievements.map(a => a.category));
      cats.forEach(c => { categoryCount[c] = (categoryCount[c] || 0) + 1; });
    });

    // Collect all denominators and patterns
    const allDenominators = groupProfiles.flatMap(p => p.commonDenominators);
    const allPatterns = groupProfiles.flatMap(p => p.performancePattern);

    return { categoryCount, allDenominators, allPatterns, memberCount: groupProfiles.length };
  };

  // USN Header component
  const USNHeader = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#6B2D8B]/10 px-3 py-2 md:px-6 md:py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Image 
            src="/usn-logo.jpg" 
            alt="USN - Universitetet i Sørøst-Norge" 
            width={140}
            height={40}
            className="h-8 md:h-10 w-auto"
          />
          <div className="text-xs md:text-sm border-l border-gray-300 pl-3 md:pl-4">
            <div className="font-semibold text-[#1E3A5F]">PRO1000</div>
            <div className="text-[#6B2D8B] text-[10px] md:text-xs">Topprestasjonsmønster</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render different steps
  if (step === 'welcome') {
    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center px-4 py-4 pt-16 md:pt-20">
          <div className="max-w-2xl w-full text-center text-white">
            {/* USN Logo area */}
            <div className="mb-4 md:mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm">
                <span className="font-semibold">PRO1000</span>
                <span className="text-white/60">|</span>
                <span className="text-white/80">USN</span>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-serif font-normal mb-3 md:mb-6 px-2">
              Ditt Topprestasjonsmønster
            </h1>
            <p className="text-base md:text-xl mb-6 md:mb-8 text-white/80 px-2">
              Oppdag når du presterer best, og forstå hvordan gruppens styrker utfyller hverandre.
            </p>
            
            <div className="bg-white/10 backdrop-blur rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 text-left border border-white/20">
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 font-serif">Hva skjer?</h2>
              <ol className="space-y-2 md:space-y-3 text-white/90 text-sm md:text-base">
                <li className="flex items-start gap-2 md:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-xs md:text-sm font-bold">1</span>
                  <span>Du fyller ut prestasjoner du er stolt av</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-xs md:text-sm font-bold">2</span>
                  <span>Velger dine 3 beste og reflekterer over dem</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-xs md:text-sm font-bold">3</span>
                  <span>Finner dine fellesnevnere og mønster</span>
                </li>
                <li className="flex items-start gap-2 md:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-[#FF6B35] rounded-full flex items-center justify-center text-xs md:text-sm font-bold">4</span>
                  <span>Del med gruppen din og se hvordan dere utfyller hverandre!</span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col gap-3 md:flex-row md:gap-4 justify-center">
              <button
                onClick={() => setStep('name')}
                className="bg-[#FF6B35] text-white px-6 py-3.5 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#FF8255] transition shadow-lg hover:shadow-xl min-h-[48px]"
              >
                Start øvelsen →
              </button>
              <button
                onClick={() => setStep('browse')}
                className="bg-white/20 text-white px-6 py-3.5 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-white/30 transition border border-white/30 min-h-[48px]"
              >
                Se gruppeoversikt
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
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center px-4 py-4 pt-16 md:pt-20">
          <div className="max-w-md w-full bg-white rounded-xl md:rounded-2xl p-5 md:p-8 shadow-2xl">
            <div className="text-center mb-5 md:mb-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-[#E8D8F0] rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <span className="text-2xl md:text-3xl">👋</span>
              </div>
              <h2 className="text-xl md:text-2xl font-serif text-[#1E3A5F] mb-2">Hva heter du?</h2>
              <p className="text-gray-500 text-sm">Dette brukes til å identifisere profilen din</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt navn..."
              className="w-full p-3.5 md:p-4 border-2 border-[#E8D8F0] rounded-xl text-base md:text-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 min-h-[48px]"
              autoFocus
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Din SYS1000-gruppe</label>
              <input
                type="text"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                placeholder="F.eks. 1, 2, 3..."
                className="w-full p-3.5 md:p-4 border-2 border-[#E8D8F0] rounded-xl text-base md:text-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 min-h-[48px]"
              />
              <p className="text-xs text-gray-400 mt-1">Skriv inn gruppenummeret ditt fra SYS1000</p>
            </div>
            <button
              onClick={() => name.trim() && setStep('achievements')}
              disabled={!name.trim()}
              className="w-full mt-5 md:mt-6 bg-[#6B2D8B] text-white py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#8B4DAB] transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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
        <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg mb-4 md:mb-6 border border-[#E8D8F0]">
              <div className="flex items-start gap-2 md:gap-3 mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">1</div>
                <div>
                  <h2 className="text-lg md:text-2xl font-serif text-[#1E3A5F]">Prestasjoner du er stolt av</h2>
                  <p className="text-gray-500 text-xs md:text-sm">Tenk tilbake på situasjoner der du lyktes med en oppgave eller aktivitet</p>
                </div>
              </div>
              
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition font-medium text-sm md:text-base min-h-[36px] md:min-h-[40px] ${
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
              <div className="flex flex-col md:flex-row gap-2 mb-4 md:mb-6">
                <input
                  type="text"
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAchievement()}
                  placeholder="Beskriv en prestasjon..."
                  className="flex-1 p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[48px]"
                />
                <button
                  onClick={addAchievement}
                  className="bg-[#FF6B35] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#FF8255] transition min-h-[48px]"
                >
                  + Legg til
                </button>
              </div>

              {/* Achievement list */}
              <div className="space-y-2 mb-4 md:mb-6">
                {achievements.map(ach => {
                  const cat = CATEGORIES.find(c => c.id === ach.category);
                  return (
                    <div key={ach.id} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-[#F5F0E8] rounded-xl border border-[#E8D8F0]">
                      <span className="text-lg md:text-xl flex-shrink-0">{cat?.emoji}</span>
                      <span className="flex-1 text-[#1E3A5F] text-sm md:text-base break-words">{ach.description}</span>
                      <button
                        onClick={() => setAchievements(achievements.filter(a => a.id !== ach.id))}
                        className="text-red-400 hover:text-red-600 transition p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {achievements.length === 0 && (
                <div className="text-center py-6 md:py-8 text-gray-400">
                  <div className="text-3xl md:text-4xl mb-2">📝</div>
                  <p className="text-sm md:text-base">Legg til minst 3 prestasjoner for å fortsette</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('top-three')}
              disabled={achievements.length < 3}
              className="w-full bg-[#6B2D8B] text-white py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#8B4DAB] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg min-h-[48px]"
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
          <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg mb-4 md:mb-6 border border-[#E8D8F0]">
                <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">2</div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-serif text-[#1E3A5F]">Velg dine 3 viktigste</h2>
                    <p className="text-[#6B2D8B] font-medium text-sm md:text-base">Valgt: {topThree.length}/3</p>
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
                        className={`w-full flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition text-left min-h-[56px] ${
                          isSelected
                            ? 'bg-[#E8D8F0] border-2 border-[#6B2D8B]'
                            : 'bg-[#F5F0E8] hover:bg-[#E8D8F0] border-2 border-transparent'
                        }`}
                      >
                        <span className="text-xl md:text-2xl flex-shrink-0">{cat?.emoji}</span>
                        <span className="flex-1 text-[#1E3A5F] text-sm md:text-base break-words">{ach.description}</span>
                        {isSelected && <span className="text-[#6B2D8B] font-bold text-lg md:text-xl flex-shrink-0">✓</span>}
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
        <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <span className="text-xs md:text-sm text-[#6B2D8B] font-medium bg-[#E8D8F0] px-2.5 py-1 md:px-3 rounded-full">
                  Prestasjon {currentTopIndex + 1} av 3
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition ${
                        i <= currentTopIndex ? 'bg-[#6B2D8B]' : 'bg-[#E8D8F0]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <h2 className="text-base md:text-xl font-serif text-[#1E3A5F] mb-4 md:mb-6 pb-3 md:pb-4 border-b border-[#E8D8F0] break-words">{currentTop.title}</h2>
              
              <div className="space-y-3 md:space-y-4 max-h-[50vh] md:max-h-[55vh] overflow-y-auto pr-1 md:pr-2">
                {ACHIEVEMENT_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <label className="block text-xs md:text-sm font-medium text-[#1E3A5F] mb-1">
                      {q.label}
                    </label>
                    <textarea
                      value={currentTop.answers[q.key as keyof typeof currentTop.answers]}
                      onChange={(e) => updateTopAnswer(currentTopIndex, q.key, e.target.value)}
                      className="w-full p-2.5 md:p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none resize-none transition text-base text-gray-900 placeholder:text-gray-400"
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
                className="w-full mt-4 md:mt-6 bg-[#6B2D8B] text-white py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#8B4DAB] transition min-h-[48px]"
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
        <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">3</div>
                <div>
                  <h2 className="text-lg md:text-2xl font-serif text-[#1E3A5F]">Fellesnevnere</h2>
                  <p className="text-gray-500 text-xs md:text-sm">Hva går igjen i alle prestasjonene dine?</p>
                </div>
              </div>
              
              <div className="space-y-2.5 md:space-y-3">
                {commonDenominators.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#FF6B35] font-bold flex-shrink-0">→</span>
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => {
                        const updated = [...commonDenominators];
                        updated[i] = e.target.value;
                        setCommonDenominators(updated);
                      }}
                      placeholder={`Fellesnevner ${i + 1}...`}
                      className="flex-1 p-2.5 md:p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('pattern')}
                className="w-full mt-4 md:mt-6 bg-[#6B2D8B] text-white py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#8B4DAB] transition min-h-[48px]"
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
        <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-[#E8D8F0]">
              <div className="flex items-start gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">4</div>
                <div>
                  <h2 className="text-lg md:text-2xl font-serif text-[#1E3A5F]">Ditt topprestasjonsmønster</h2>
                  <p className="text-gray-500 text-xs md:text-sm">Hva er din personlige suksessoppskrift?</p>
                </div>
              </div>
              
              <div className="space-y-2.5 md:space-y-3">
                {performancePattern.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#FF6B35] font-bold flex-shrink-0">→</span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const updated = [...performancePattern];
                        updated[i] = e.target.value;
                        setPerformancePattern(updated);
                      }}
                      placeholder={`Del av mønsteret...`}
                      className="flex-1 p-2.5 md:p-3 border-2 border-[#E8D8F0] rounded-xl focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full mt-4 md:mt-6 bg-[#FF6B35] text-white py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#FF8255] transition shadow-lg min-h-[48px]"
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
        <div className="min-h-screen bg-gradient-to-br from-[#6B2D8B] via-[#8B4DAB] to-[#FF6B35] flex items-center justify-center px-4 py-4 pt-16 md:pt-20">
          <div className="max-w-md w-full text-center text-white">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <span className="text-4xl md:text-5xl">🎉</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif mb-3 md:mb-4">Profilen din er lagret!</h1>
            <p className="text-white/80 mb-6 md:mb-8 text-sm md:text-base px-4">
              Nå kan du se gruppens profiler og forstå hvordan dere utfyller hverandre.
            </p>
            <button
              onClick={() => setStep('browse')}
              className="bg-white text-[#6B2D8B] px-6 py-3.5 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#E8D8F0] transition shadow-lg min-h-[48px]"
            >
              Se gruppeoversikt →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === 'browse') {
    const groupedProfiles = getGroupProfiles();
    const availableGroups = getAvailableGroups();
    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    const myProfileId = localStorage.getItem('topprestasjon_profile_id');
    const isOwnProfile = selectedProfile && selectedProfile.id === myProfileId;

    // Filter profiles by group if selected
    const filteredProfiles = filterGroup
      ? groupedProfiles.filter(p => p.groupNumber === filterGroup)
      : groupedProfiles;

    if (selectedProfile) {
      return (
        <>
          <USNHeader />
          <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => { setSelectedProfileId(null); setIsEditing(false); }}
                className="mb-3 md:mb-4 text-[#6B2D8B] hover:text-[#8B4DAB] font-medium flex items-center gap-2 transition p-2 -ml-2 min-h-[44px]"
              >
                <span>←</span> Tilbake til oversikt
              </button>
              
              <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-[#E8D8F0]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg flex-shrink-0 ${isOwnProfile ? 'bg-gradient-to-br from-[#FF6B35] to-[#FFB347] ring-2 md:ring-4 ring-[#FF6B35]/30' : 'bg-gradient-to-br from-[#6B2D8B] to-[#FF6B35]'}`}>
                      {selectedProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-xl md:text-2xl font-serif text-[#1E3A5F] border-2 border-[#E8D8F0] rounded-lg px-2 py-1 w-full focus:border-[#6B2D8B] focus:outline-none text-gray-900 placeholder:text-gray-400"
                        />
                      ) : (
                        <h2 className="text-xl md:text-2xl font-serif text-[#1E3A5F] break-words">{selectedProfile.name}</h2>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {isOwnProfile && !isEditing && (
                          <span className="inline-flex items-center gap-1 text-[#FF6B35] font-medium bg-[#FF6B35]/10 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm">
                            Din profil
                          </span>
                        )}
                        {selectedProfile.groupNumber && !isEditing && (
                          <span className="inline-flex items-center gap-1 text-[#6B2D8B] font-medium bg-[#E8D8F0] px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm">
                            👥 Gruppe {selectedProfile.groupNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOwnProfile && !isEditing && (
                    <button
                      onClick={() => startEditing(selectedProfile)}
                      className="bg-[#6B2D8B] text-white px-4 py-2.5 rounded-full font-medium hover:bg-[#8B4DAB] transition flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
                    >
                      ✏️ Rediger
                    </button>
                  )}
                </div>

                <div className="mb-4 md:mb-6">
                  <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Kategorier</h3>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {[...new Set(selectedProfile.achievements.map(a => a.category))].map(cat => {
                      const catInfo = CATEGORIES.find(c => c.id === cat);
                      return (
                        <span key={cat} className="px-2.5 py-1 md:px-3 bg-[#E8D8F0] text-[#6B2D8B] rounded-full text-xs md:text-sm font-medium">
                          {catInfo?.emoji} {catInfo?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="mb-4 md:mb-6">
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">SYS1000-gruppe</h3>
                      <input
                        type="text"
                        value={editGroupNumber}
                        onChange={(e) => setEditGroupNumber(e.target.value)}
                        placeholder="Gruppenummer..."
                        className="w-full p-2.5 md:p-2 border-2 border-[#E8D8F0] rounded-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[44px]"
                      />
                    </div>

                    <div className="mb-4 md:mb-6">
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Fellesnevnere</h3>
                      <div className="space-y-2">
                        {editCommonDenominators.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#FF6B35] flex-shrink-0">→</span>
                            <input
                              type="text"
                              value={d}
                              onChange={(e) => {
                                const updated = [...editCommonDenominators];
                                updated[i] = e.target.value;
                                setEditCommonDenominators(updated);
                              }}
                              placeholder={`Fellesnevner ${i + 1}...`}
                              className="flex-1 p-2.5 md:p-2 border-2 border-[#E8D8F0] rounded-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[44px]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4 md:mb-6">
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Topprestasjonsmønster</h3>
                      <div className="space-y-2">
                        {editPerformancePattern.map((p, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#FF6B35] flex-shrink-0">→</span>
                            <input
                              type="text"
                              value={p}
                              onChange={(e) => {
                                const updated = [...editPerformancePattern];
                                updated[i] = e.target.value;
                                setEditPerformancePattern(updated);
                              }}
                              placeholder={`Del av mønsteret...`}
                              className="flex-1 p-2.5 md:p-2 border-2 border-[#E8D8F0] rounded-lg focus:border-[#6B2D8B] focus:outline-none transition text-gray-900 placeholder:text-gray-400 text-base min-h-[44px]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-full font-bold hover:bg-gray-300 transition min-h-[48px]"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={() => handleUpdateProfile(selectedProfile)}
                        disabled={isSaving}
                        className="flex-1 bg-[#FF6B35] text-white py-3 rounded-full font-bold hover:bg-[#FF8255] transition disabled:opacity-50 min-h-[48px]"
                      >
                        {isSaving ? 'Lagrer...' : '✓ Lagre endringer'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedProfile.commonDenominators.length > 0 && (
                      <div className="mb-4 md:mb-6">
                        <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Fellesnevnere</h3>
                        <ul className="space-y-1.5">
                          {selectedProfile.commonDenominators.map((d, i) => (
                            <li key={i} className="text-gray-600 flex items-start gap-2 text-sm md:text-base">
                              <span className="text-[#FF6B35] flex-shrink-0">→</span> <span className="break-words">{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedProfile.performancePattern.length > 0 && (
                      <div className="mb-4 md:mb-6">
                        <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Topprestasjonsmønster</h3>
                        <ul className="space-y-1.5">
                          {selectedProfile.performancePattern.map((p, i) => (
                            <li key={i} className="text-gray-600 flex items-start gap-2 text-sm md:text-base">
                              <span className="text-[#FF6B35] flex-shrink-0">→</span> <span className="break-words">{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold text-[#1E3A5F] mb-2 font-serif text-sm md:text-base">Topp 3 prestasjoner</h3>
                      <div className="space-y-2">
                        {selectedProfile.topThree.map((t, i) => (
                          <div key={i} className="p-2.5 md:p-3 bg-[#F5F0E8] rounded-xl border border-[#E8D8F0]">
                            <span className="font-medium text-[#1E3A5F] text-sm md:text-base break-words">{i + 1}. {t.title}</span>
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

    // Group overview card when filtering by a specific group
    const showGroupOverview = filterGroup && availableGroups.includes(filterGroup);
    const groupOverview = showGroupOverview ? getGroupOverview(filterGroup) : null;

    return (
      <>
        <USNHeader />
        <div className="min-h-screen bg-[#F5F0E8] px-3 py-3 pt-14 md:p-4 md:pt-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-[#1E3A5F]">Gruppeoversikt</h1>
                <p className="text-gray-500 text-xs md:text-sm">Se hvordan gruppens styrker utfyller hverandre</p>
              </div>
              {!myProfileId && (
                <button
                  onClick={() => setStep('name')}
                  className="bg-[#6B2D8B] text-white px-4 py-2.5 rounded-full font-medium hover:bg-[#8B4DAB] transition min-h-[44px] w-full sm:w-auto"
                >
                  + Opprett din profil
                </button>
              )}
            </div>

            {/* Group filter */}
            {availableGroups.length > 0 && (
              <div className="mb-4 md:mb-6">
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  <button
                    onClick={() => setFilterGroup('')}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition font-medium text-sm md:text-base min-h-[36px] ${
                      !filterGroup
                        ? 'bg-[#6B2D8B] text-white'
                        : 'bg-white text-[#6B2D8B] border border-[#E8D8F0] hover:bg-[#E8D8F0]'
                    }`}
                  >
                    Alle
                  </button>
                  {availableGroups.map(g => (
                    <button
                      key={g}
                      onClick={() => setFilterGroup(g!)}
                      className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full transition font-medium text-sm md:text-base min-h-[36px] ${
                        filterGroup === g
                          ? 'bg-[#6B2D8B] text-white'
                          : 'bg-white text-[#6B2D8B] border border-[#E8D8F0] hover:bg-[#E8D8F0]'
                      }`}
                    >
                      Gruppe {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group overview card */}
            {showGroupOverview && groupOverview && groupOverview.memberCount > 0 && (
              <div className="bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg mb-4 md:mb-6 text-white">
                <h2 className="text-lg md:text-xl font-serif mb-3 md:mb-4 flex items-center gap-2">
                  👥 Gruppe {filterGroup} — Styrker og mønster
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Kategorier i gruppen</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(groupOverview.categoryCount)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, count]) => {
                          const catInfo = CATEGORIES.find(c => c.id === cat);
                          return (
                            <span key={cat} className="px-2.5 py-1 bg-white/20 rounded-full text-xs md:text-sm">
                              {catInfo?.emoji} {catInfo?.label} ({count})
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Fellesnevnere i gruppen</h3>
                    <div className="space-y-1">
                      {groupOverview.allDenominators.slice(0, 6).map((d, i) => (
                        <div key={i} className="text-xs md:text-sm text-white/90 flex items-start gap-1.5">
                          <span className="text-[#FFB347] flex-shrink-0">→</span> {d}
                        </div>
                      ))}
                      {groupOverview.allDenominators.length === 0 && (
                        <p className="text-xs text-white/60">Ingen fellesnevnere lagt inn ennå</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs md:text-sm text-white/70">
                  {groupOverview.memberCount} {groupOverview.memberCount === 1 ? 'medlem' : 'medlemmer'} har delt profilen sin
                </div>
              </div>
            )}

            {profiles.length === 0 ? (
              <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 text-center text-gray-500 border border-[#E8D8F0]">
                <div className="text-4xl md:text-5xl mb-3 md:mb-4">👥</div>
                <p className="text-lg md:text-xl mb-2 font-serif text-[#1E3A5F]">Ingen profiler ennå</p>
                <p className="text-gray-400 text-sm md:text-base">Vær den første til å dele din profil med gruppen!</p>
              </div>
            ) : (
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                {filteredProfiles.map(profile => {
                  const isOwn = profile.isOwnProfile;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`p-3 md:p-4 rounded-xl shadow-sm hover:shadow-md transition text-left min-h-[72px] ${
                        isOwn 
                          ? 'bg-gradient-to-br from-[#FF6B35]/10 to-[#FFB347]/10 border-2 border-[#FF6B35] hover:border-[#FF8255]' 
                          : 'bg-white border border-[#E8D8F0] hover:border-[#6B2D8B]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 md:gap-3">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold shadow flex-shrink-0 text-sm md:text-base ${
                          isOwn 
                            ? 'bg-gradient-to-br from-[#FF6B35] to-[#FFB347]' 
                            : 'bg-gradient-to-br from-[#6B2D8B] to-[#FF6B35]'
                        }`}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-[#1E3A5F] text-sm md:text-base truncate">{profile.name}</h3>
                            {isOwn && (
                              <span className="text-[10px] md:text-xs bg-[#FF6B35] text-white px-1.5 py-0.5 md:px-2 rounded-full flex-shrink-0">Du</span>
                            )}
                            {profile.groupNumber && (
                              <span className="text-[10px] md:text-xs bg-[#E8D8F0] text-[#6B2D8B] px-1.5 py-0.5 md:px-2 rounded-full flex-shrink-0">Gr. {profile.groupNumber}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-0.5 md:gap-1 mt-1">
                            {[...new Set(profile.achievements.map(a => a.category))].slice(0, 3).map(cat => {
                              const catInfo = CATEGORIES.find(c => c.id === cat);
                              return <span key={cat} className="text-base md:text-lg">{catInfo?.emoji}</span>;
                            })}
                          </div>
                        </div>
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
