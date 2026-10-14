import { Share } from 'react-native';

/** Hands text to the system share sheet, from where it can be saved, mailed or opened in another app. */
export async function shareText(_filename: string, text: string) {
  await Share.share({ message: text });
}
