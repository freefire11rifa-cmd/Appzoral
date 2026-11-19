export type AppType = 'Games' | 'Apps';

export type AgeRating = '3+' | '7+' | '12+' | '16+' | '18+';

export type Language = 'en' | 'bn';

export interface StoreApp {
  id: string;
  ownerId: string;
  title: string;
  titleLower: string;
  packageName: string;
  developerName: string;
  appType: AppType;
  category: string;
  shortDescription: string;
  description: string;
  whatsNew: string;
  version: string;
  sizeLabel: string;
  ageRating: AgeRating;
  iconUrl: string;
  bannerUrl: string;
  screenshots: string[];
  downloadUrl: string;
  apkFileName: string;
  rating: number;
  ratingCount: number;
  installCount: number;
  status: 'published' | 'draft';
  isSeed?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DeveloperProfile {
  uid: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  passwordHash: string;
  agreedToTerms: boolean;
  status: 'pending_verification' | 'verified';
  verificationToken: string;
  studioName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppReview {
  id: string;
  appId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface UserLibraryItem {
  appId: string;
  userId: string;
  installed: boolean;
  wishlisted: boolean;
  installedVersion: string;
  updatedAt?: unknown;
}

export type ActiveTab = 'home' | 'games' | 'apps' | 'categories' | 'library';
