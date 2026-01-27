export interface Achievement {
  id: string;
  category: 'studier' | 'jobb' | 'frivillig' | 'hobbyer' | 'idrett' | 'familie';
  description: string;
}

export interface TopAchievement {
  id: string;
  title: string;
  answers: {
    whatWasIt: string;          // Hva var oppgaven/aktiviteten?
    whyYou: string;             // Hvorfor skulle du gjøre akkurat denne?
    thoughtsAndFeelings: string; // Hva tenkte og følte du?
    howPrepared: string;        // Hvordan forberedte du deg?
    howWorked: string;          // Hvordan jobbet du med det?
    feelingsDuring: string;     // Hvilke tanker og følelser underveis?
    handledResistance: string;  // Hvordan taklet du motstand?
    othersInvolved: string;     // Var andre involvert?
    result: string;             // Hva var resultatet?
    reward: string;             // Hva var belønningen?
    feelingsAfter: string;      // Hvilke følelser i etterkant?
  };
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  achievements: Achievement[];
  topThree: TopAchievement[];
  commonDenominators: string[];
  performancePattern: string[];
}

export const CATEGORIES = [
  { id: 'studier', label: 'Studier', emoji: '📚' },
  { id: 'jobb', label: 'Jobb', emoji: '💼' },
  { id: 'frivillig', label: 'Frivillige verv', emoji: '🤝' },
  { id: 'hobbyer', label: 'Hobbyer', emoji: '🎨' },
  { id: 'idrett', label: 'Idrett', emoji: '⚽' },
  { id: 'familie', label: 'Familie og venner', emoji: '❤️' },
] as const;

export const ACHIEVEMENT_QUESTIONS = [
  { key: 'whatWasIt', label: 'Hva var oppgaven/aktiviteten?' },
  { key: 'whyYou', label: 'Hvorfor skulle du gjøre akkurat denne oppgaven?' },
  { key: 'thoughtsAndFeelings', label: 'Hva tenkte og følte du rundt det å skulle gjennomføre?' },
  { key: 'howPrepared', label: 'Hvordan forberedte du deg?' },
  { key: 'howWorked', label: 'Hvordan jobbet du med å løse oppgaven?' },
  { key: 'feelingsDuring', label: 'Hvilke tanker og følelser hadde du underveis?' },
  { key: 'handledResistance', label: 'Hvordan taklet du eventuell motstand?' },
  { key: 'othersInvolved', label: 'Var det andre involvert? Hvem og hvilken rolle?' },
  { key: 'result', label: 'Hva var resultatet?' },
  { key: 'reward', label: 'Hva var belønningen når du kom i mål?' },
  { key: 'feelingsAfter', label: 'Hvilke følelser kjente du i etterkant?' },
] as const;
