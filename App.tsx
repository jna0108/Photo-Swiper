/**
 * Photo Swiper App
 * Swipe left to delete, swipe right to keep
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DeckScreen from './src/screens/DeckScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#fff"
      />
      <DeckScreen />
    </SafeAreaProvider>
  );
}

export default App;
