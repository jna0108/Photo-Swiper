import { NativeModules } from 'react-native';
import { PhotoItem } from '../types';

const { PhotoSwiperSAF } = NativeModules;

interface SAFModule {
  pickFolder(): Promise<string>; // Returns persisted tree URI
  listImages(folderUri: string, pageSize?: number, offset?: number): Promise<PhotoItem[]>;
  deletePhoto(photoUri: string): Promise<boolean>;
  moveToTrash(photoUri: string, trashFolderUri?: string): Promise<boolean>;
  getPhotoDimensions(photoUri: string): Promise<{ width: number; height: number }>;
}

const SafNative: SAFModule = PhotoSwiperSAF;

export default SafNative;
