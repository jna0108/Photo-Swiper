import { create } from 'zustand';
import { PhotoItem, DeckAction } from '../types';

interface DeckStore {
  // Queue state
  photos: PhotoItem[];
  currentIndex: number;
  folderUri: string | null;

  // Actions log
  actions: DeckAction[];
  trashQueue: PhotoItem[];

  // Setters
  setPhotos: (photos: PhotoItem[]) => void;
  appendPhotos: (photos: PhotoItem[]) => void;
  setCurrentIndex: (index: number) => void;
  setFolderUri: (uri: string | null) => void;

  // Action methods
  markKeep: (photoUri: string) => void;
  markDelete: (photoUri: string) => void;
  undo: () => void;
  clearTrash: () => void;

  // Getters
  getCurrentPhoto: () => PhotoItem | null;
  getNextPhotos: (count: number) => PhotoItem[];
  canUndo: () => boolean;
  getTrashCount: () => number;
}

const useDeckStore = create<DeckStore>((set, get) => ({
  photos: [],
  currentIndex: 0,
  folderUri: null,
  actions: [],
  trashQueue: [],

  setPhotos: (photos) => set({ photos, currentIndex: 0 }),
  appendPhotos: (newPhotos) => {
    const existing = get().photos;
    const merged = [...existing, ...newPhotos];
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      if (seen.has(item.uri)) return false;
      seen.add(item.uri);
      return true;
    });
    set({ photos: unique });
  },
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setFolderUri: (uri) => set({ folderUri: uri }),

  markKeep: (photoUri) => {
    const { actions } = get();
    set({
      actions: [...actions, { photoUri, action: 'keep', timestamp: Date.now() }],
    });
    const { currentIndex, photos } = get();
    if (currentIndex < photos.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  markDelete: (photoUri) => {
    const { actions, photos, currentIndex, trashQueue } = get();
    const photo = photos.find((p) => p.uri === photoUri);
    const alreadyInTrash = trashQueue.some((p) => p.uri === photoUri);
    set({
      actions: [...actions, { photoUri, action: 'delete', timestamp: Date.now() }],
      trashQueue:
        photo && !alreadyInTrash ? [...trashQueue, photo] : trashQueue,
    });
    if (currentIndex < photos.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  undo: () => {
    const { actions, trashQueue } = get();
    if (actions.length === 0) return;

    const lastAction = actions[actions.length - 1];
    const newActions = actions.slice(0, -1);
    let newTrash = trashQueue;

    if (lastAction.action === 'delete') {
      newTrash = trashQueue.filter((p) => p.uri !== lastAction.photoUri);
    }

    set({
      actions: newActions,
      trashQueue: newTrash,
      currentIndex: Math.max(0, get().currentIndex - 1),
    });
  },

  clearTrash: () => set({ trashQueue: [] }),

  getCurrentPhoto: () => {
    const { photos, currentIndex } = get();
    return photos[currentIndex] || null;
  },

  getNextPhotos: (count) => {
    const { photos, currentIndex } = get();
    return photos.slice(currentIndex + 1, currentIndex + 1 + count);
  },

  canUndo: () => get().actions.length > 0,
  getTrashCount: () => get().trashQueue.length,
}));

export default useDeckStore;
