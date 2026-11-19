import { AppType } from '../types';

export interface CategoryMeta {
  name: string;
  bnName: string;
  appType: AppType;
  description: string;
}

export const GAME_CATEGORIES: CategoryMeta[] = [
  { name: 'Action', bnName: 'অ্যাকশন', appType: 'Games', description: 'Fast-paced combat, survival & arena battles' },
  { name: 'Racing', bnName: 'রেসিং', appType: 'Games', description: 'High-speed street, drift & circuit racing' },
  { name: 'RPG', bnName: 'আরপিজি', appType: 'Games', description: 'Open-world quests, heroes & story campaigns' },
  { name: 'Adventure', bnName: 'অ্যাডভেঞ্চার', appType: 'Games', description: 'Exploration, mystery & narrative journeys' },
  { name: 'Strategy', bnName: 'স্ট্র্যাটেজি', appType: 'Games', description: 'Tactical warfare, base building & chess' },
  { name: 'Puzzle', bnName: 'পাজল', appType: 'Games', description: 'Logic challenges, match-3 & brain teasers' },
  { name: 'Sports', bnName: 'স্পোর্টস', appType: 'Games', description: 'Cricket, football & tournament simulations' },
  { name: 'Simulation', bnName: 'সিমুলেশন', appType: 'Games', description: 'Life, city building & flight simulators' },
  { name: 'Arcade', bnName: 'আর্কেড', appType: 'Games', description: 'Pick-up-and-play endless runners & classics' },
];

export const APP_CATEGORIES: CategoryMeta[] = [
  { name: 'Tools', bnName: 'টুলস', appType: 'Apps', description: 'Utilities, file managers, scanners & cleaners' },
  { name: 'Productivity', bnName: 'প্রোডাক্টিভিটি', appType: 'Apps', description: 'Notes, docs, calendars & workflow suites' },
  { name: 'Finance', bnName: 'ফাইন্যান্স', appType: 'Apps', description: 'Wallets, expense ledgers & mobile banking' },
  { name: 'Photography', bnName: 'ফটোগ্রাফি', appType: 'Apps', description: 'RAW photo editors, filters & pro cameras' },
  { name: 'Social', bnName: 'সোশ্যাল', appType: 'Apps', description: 'Messaging, communities & video calls' },
  { name: 'Education', bnName: 'শিক্ষা', appType: 'Apps', description: 'Courses, dictionaries & exam prep' },
  { name: 'Entertainment', bnName: 'বিনোদন', appType: 'Apps', description: 'HD streaming, cinema & live channels' },
  { name: 'Music & Audio', bnName: 'মিউজিক ও অডিও', appType: 'Apps', description: 'Lossless players, podcasts & beat makers' },
  { name: 'Shopping', bnName: 'শপিং', appType: 'Apps', description: 'Online marketplaces, deals & local delivery' },
  { name: 'Health & Fitness', bnName: 'স্বাস্থ্য ও ফিটনেস', appType: 'Apps', description: 'Workout trackers, sleep & step counters' },
];

export const ALL_CATEGORIES: CategoryMeta[] = [...GAME_CATEGORIES, ...APP_CATEGORIES];
