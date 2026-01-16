export interface PhotoItem {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  modified?: number;
}

export interface DeckAction {
  photoUri: string;
  action: 'keep' | 'delete';
  timestamp: number;
}

export enum ImageSource {
  SAF_FOLDER = 'saf_folder',
  MEDIA_STORE = 'media_store',
}
