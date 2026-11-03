import type { UserData } from '../data/UserData';
import { ViewLicenceScreen } from './ViewLicenceScreen';

interface LicenceScreenProps {
  userData: UserData;
  photoUri: string | null;
  onUserDataChange?: (data: UserData) => void;
}

export function LicenceScreen({ userData, photoUri }: LicenceScreenProps) {
  return (
    <ViewLicenceScreen
      userData={userData}
      photoUri={photoUri}
    />
  );
}
