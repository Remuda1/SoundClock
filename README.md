# Audio Clock - React Native Version

A React Native/Expo version of the accessible audio clock app that tells time through sound patterns rather than visual display.

## What This App Does

Every 15 seconds, the app plays an audio sequence that encodes the current hour, minute, and second using different environmental sounds with strategic "cuts" (silence interruptions). This allows users to tell time audibly.

## Project Structure

```
src/
├── App.tsx              # Main React Native UI component
├── Root.tsx             # Root component with SafeAreaProvider
├── types.ts             # TypeScript type definitions
├── constants.ts         # Constants (audio files, defaults)
├── encoding.ts          # Time-to-sound encoding logic
├── timing.ts            # 15-second cycle timing logic
├── storage.ts           # AsyncStorage persistence
└── audio.ts             # Expo-av audio playback management

assets/                  # Audio files
├── Horgan.mp3
├── Hfan2.mp3
├── Hhvac.m4a
├── Hocean.mp3
├── singingbowl3s.mp3
├── aww3s.mp3
└── pinging.mp3
```

## Getting Started

### Installation

```bash
npm install
```

### Running the App

**Expo Go (Easiest):**
```bash
npm run dev
```
Then use Expo Go app on your phone to scan the QR code.

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web (Experimental):**
```bash
npm run web
```

## Building for Production

To build for EAS (Expo Application Services):

```bash
eas build --platform ios
eas build --platform android
```

Or for local builds:

```bash
eas build --local --platform ios
eas build --local --platform android
```

## Features

- Real-time audio encoding of hour, minute, and one-minute segments
- Configurable segment lengths, volumes, and cut parameters
- Active window scheduling (run only during specific hours)
- Preview mode to audition different times
- Automatic cycle timing that snaps to 15-second boundaries
- Settings persistence using AsyncStorage
- Full control over audio file volumes
- Time mapping visualization

## Architecture Changes from Web Version

### Audio Playback
- **Web**: HTML5 Web Audio API
- **React Native**: `expo-av` for cross-platform audio

### State Management
- **Web**: Direct DOM manipulation + localStorage
- **React Native**: React hooks + AsyncStorage

### UI
- **Web**: HTML/CSS
- **React Native**: React Native components (View, Text, ScrollView, TextInput, etc.)

### File Loading
- **Web**: Relative file paths
- **React Native**: Require statements for bundled assets in expo

## Key Features Ported

1. **Time Encoding** - All encoding logic remains identical
2. **15-Second Cycle** - Exact same timing algorithm
3. **Settings** - All configuration options available
4. **Audio Segments** - Same 4-phase cycle (HOUR, TEN-MIN, ONE-MIN, PING)
5. **Cut Patterns** - Identical cut silence and fade parameters
6. **Active Windows** - Same scheduling logic

## Native Permissions

The app requests audio permissions on iOS/Android automatically via Expo plugins.

## Troubleshooting

**Audio not playing?**
- Check device volume is not muted
- Ensure app has audio permissions (check device settings)
- On iOS, test with "Silent" switch off

**Settings not persisting?**
- AsyncStorage may need app restart
- Clear app cache/data and reinstall if issues persist

**App crashes on startup?**
- Check that all audio files are in `assets/` directory
- Verify file names match exactly (case-sensitive)

## Technology Stack

- React Native 0.74
- Expo 51
- expo-av 14 (audio playback)
- @react-native-async-storage/async-storage 1.23
- TypeScript 5.3

## Notes

- The pinging.mp3 file is a placeholder. Replace with actual ping sound if desired
- Audio format support varies by platform (MP3 and M4A are safe bets)
- Web builds may have limited audio support compared to mobile
- Testing on real devices is recommended for audio performance
