import { DEFAULT_USER_DATA, STORAGE_KEYS, type UserData } from './UserData';

/**
 * Local persistence layer — mirrors the original DataStore Preferences
 * approach using localStorage (synchronous for Stage 1; can migrate
 * to IndexedDB later if needed).
 */
export class UserRepository {
  loadUserData(): UserData {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!raw) return { ...DEFAULT_USER_DATA };
      const parsed = JSON.parse(raw) as Partial<UserData>;
      return { ...DEFAULT_USER_DATA, ...parsed };
    } catch {
      return { ...DEFAULT_USER_DATA };
    }
  }

  saveUserData(data: UserData): void {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
  }

  loadPhotoUri(): string | null {
    return localStorage.getItem(STORAGE_KEYS.PHOTO_URI);
  }

  savePhotoUri(uri: string | null): void {
    if (uri) {
      localStorage.setItem(STORAGE_KEYS.PHOTO_URI, uri);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PHOTO_URI);
    }
  }
}

export const userRepository = new UserRepository();
