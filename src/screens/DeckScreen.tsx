import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SwipeCard from '../components/SwipeCard';
import useDeckStore from '../state/useDeckStore';
import SafNative from '../native/saf';
import { PhotoItem } from '../types';
import FastImage from 'react-native-fast-image';

const DeckScreen: React.FC = () => {
  const {
    photos,
    currentIndex,
    folderUri,
    setPhotos,
    setFolderUri,
    markKeep,
    markDelete,
    undo,
    canUndo,
    trashQueue,
    clearTrash,
    getCurrentPhoto,
  } = useDeckStore();

  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [showTrash, setShowTrash] = React.useState(false);

  // Initialize: pick folder and load images
  useEffect(() => {
    if (!folderUri) {
      handlePickFolder();
    }
  }, []);

  // Preload next 2 images if approaching the end
  useEffect(() => {
    if (photos.length > 0 && currentIndex >= photos.length - 3) {
      loadMorePhotos();
    }
  }, [currentIndex, photos.length]);

  const handlePickFolder = async () => {
    try {
      setLoading(true);
      const uri = await SafNative.pickFolder();
      if (uri) {
        setFolderUri(uri);
        await loadPhotosFromFolder(uri);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick folder: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotosFromFolder = async (uri: string, offset = 0) => {
    try {
      const pageSize = 20; // Batch size
      const newPhotos = await SafNative.listImages(uri, pageSize, offset);
      if (newPhotos && newPhotos.length > 0) {
        setPhotos(offset === 0 ? newPhotos : [...photos, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to load photos: ${error}`);
    }
  };

  const loadMorePhotos = async () => {
    if (loadingMore || !folderUri) return;
    setLoadingMore(true);
    try {
      await loadPhotosFromFolder(folderUri, photos.length);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSwipeRight = useCallback(() => {
    const current = getCurrentPhoto();
    if (current) {
      markKeep(current.uri);
    }
  }, [getCurrentPhoto, markKeep]);

  const handleSwipeLeft = useCallback(() => {
    const current = getCurrentPhoto();
    if (current) {
      markDelete(current.uri);
    }
  }, [getCurrentPhoto, markDelete]);

  const handleUndo = useCallback(() => {
    if (canUndo()) {
      undo();
    }
  }, [canUndo, undo]);

  const handleDeleteTrash = async () => {
    const trashCount = trashQueue.length;
    if (trashCount === 0) {
      Alert.alert('Empty', 'No photos to delete');
      return;
    }

    Alert.alert(
      'Delete Photos',
      `Delete ${trashCount} photo(s) permanently?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              // TODO: Implement batch delete via native module
              // For now, just clear the trash queue
              clearTrash();
              setShowTrash(false);
              Alert.alert('Success', 'Photos deleted');
            } catch (error) {
              Alert.alert('Error', `Failed to delete: ${error}`);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const currentPhoto = getCurrentPhoto();
  const trashCount = trashQueue.length;
  const hasPhotos = photos.length > 0;
  const isDone = currentIndex >= photos.length && hasPhotos;
  const trashItems = trashQueue;

  return (
    <GestureHandlerRootView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : (
        <>
          {/* Card Stack */}
          <View style={styles.deckContainer}>
            <SwipeCard
              photo={isDone ? null : currentPhoto}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
            />
          </View>

          {/* Bottom Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, !canUndo() && styles.buttonDisabled]}
                onPress={handleUndo}
                disabled={!canUndo()}
              >
                <Text style={styles.buttonText}>↶ Undo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonDelete]}
                onPress={() => setShowTrash(true)}
              >
                <Text style={styles.buttonText}>
                  🗑 Trash ({trashCount})
                </Text>
              </TouchableOpacity>
            </View>

            {isDone && (
              <View style={styles.doneContainer}>
                <Text style={styles.doneText}>All photos reviewed!</Text>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handlePickFolder}
                >
                  <Text style={styles.buttonText}>Pick New Folder</Text>
                </TouchableOpacity>
              </View>
            )}

            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingMoreText}>Loading more photos...</Text>
              </View>
            )}
          </View>
        </>
      )}

      <Modal
        visible={showTrash}
        animationType="slide"
        onRequestClose={() => setShowTrash(false)}
      >
        <View style={styles.trashContainer}>
          <View style={styles.trashHeader}>
            <Text style={styles.trashTitle}>Trash Queue ({trashCount})</Text>
            <TouchableOpacity
              style={styles.trashCloseButton}
              onPress={() => setShowTrash(false)}
            >
              <Text style={styles.trashCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.trashListContainer}
            data={trashItems}
            keyExtractor={(item) => item.uri}
            contentContainerStyle={styles.trashList}
            renderItem={({ item }) => (
              <View style={styles.trashItem}>
                <FastImage source={{ uri: item.uri }} style={styles.trashImage} />
                <Text style={styles.trashName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            )}
          />

          <View style={styles.trashFooter}>
            <TouchableOpacity
              style={styles.trashDeleteButton}
              onPress={handleDeleteTrash}
            >
              <Text style={styles.trashDeleteText}>Delete All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  deckContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonDelete: {
    backgroundColor: '#FF6B6B',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  doneContainer: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#666',
  },
  trashContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  trashHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  trashCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  trashCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trashList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  trashListContainer: {
    flex: 1,
  },
  trashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  trashImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  trashName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  trashFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  trashDeleteButton: {
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default DeckScreen;
