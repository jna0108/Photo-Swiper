import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image';
import { PhotoItem } from '../types';

interface SwipeCardProps {
  photo: PhotoItem | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDirectionChange?: (direction: 'left' | 'right' | 'neutral') => void;
}

type SwipeCardContentProps = Omit<SwipeCardProps, 'photo'> & { photo: PhotoItem };

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY_THRESHOLD = 800;

const SwipeCard: React.FC<SwipeCardProps> = ({
  photo,
  onSwipeLeft,
  onSwipeRight,
  onDirectionChange,
}) => {
  if (!photo) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Animated.Text style={styles.emptyText}>No more photos</Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <SwipeCardContent
      photo={photo}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      onDirectionChange={onDirectionChange}
    />
  );
};

const SwipeCardContent: React.FC<SwipeCardContentProps> = ({
  photo,
  onSwipeLeft,
  onSwipeRight,
  onDirectionChange,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [photo?.uri, translateX, translateY]);

  // Rotation based on horizontal drag
  const rotate = useDerivedValue(() => {
    return (translateX.value / 400) * 0.3; // Max 0.3 radians (~17 degrees)
  });

  // Determine direction for visual feedback
  const direction = useDerivedValue<'left' | 'right' | 'neutral'>(() => {
    if (translateX.value > 60) return 'right';
    if (translateX.value < -60) return 'left';
    return 'neutral';
  });

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      // Notify parent of direction change for UI feedback
      const currentDir = direction.value;
      if (onDirectionChange) {
        runOnJS(onDirectionChange)(currentDir);
      }
    })
    .onEnd((e) => {
      const vx = e.velocityX;
      const vy = e.velocityY;

      // Determine if swiped
      const shouldSwipeRight =
        translateX.value > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeLeft =
        translateX.value < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeRight) {
        // Swipe right (keep)
        translateX.value = withSpring(500, { damping: 10, mass: 1 }, () =>
          runOnJS(onSwipeRight)()
        );
      } else if (shouldSwipeLeft) {
        // Swipe left (delete)
        translateX.value = withSpring(-500, { damping: 10, mass: 1 }, () =>
          runOnJS(onSwipeLeft)()
        );
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 8, mass: 1 });
        translateY.value = withSpring(0, { damping: 8, mass: 1 });
        if (onDirectionChange) {
          runOnJS(onDirectionChange)('neutral');
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <FastImage
          source={{ uri: photo.uri }}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
});

export default SwipeCard;
