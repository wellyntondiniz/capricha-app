import { useLocalSearchParams } from 'expo-router';
import CheckInScreen from '@/features/check-in/check-in-screen';

export default function CheckInPalestrasScreen() {
  const { lectureId } = useLocalSearchParams<{ lectureId?: string | string[] }>();
  const id = lectureId === undefined ? undefined
    : typeof lectureId === 'string' && /^[1-9]\d*$/.test(lectureId) ? Number(lectureId) : NaN;
  return <CheckInScreen key={id === undefined ? 'lista' : String(id)} initialType="LECTURE_CHECKIN" lectureId={id} />;
}
