# RE:SELF - Voice Recording App

## EAS NOTE for deployment

run this in your terminal.
`eas update --branch preview --message "describe your change here"`

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android)

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd vrec
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

4. **Run on your preferred platform**

   ```bash
   # iOS Simulator
   npm run ios

   # Android Emulator
   npm run android

   # Web Browser
   npm run web
   ```

## 📁 Project Structure

```
vrec/
├── 📁 components/
│   ├── 📁 onboarding/          # Onboarding flow components
│   │   ├── WelcomeScreen.tsx       # Initial welcome screen
│   │   ├── NameInputScreen.tsx     # Name collection
│   │   ├── ParticipantIdScreen.tsx # ID collection
│   │   ├── PersonalizedWelcomeScreen.tsx
│   │   ├── ExplanationScreen.tsx   # "How it works" screens
│   │   ├── PermissionScreen.tsx    # Microphone permission
│   │   ├── Icons.tsx              # Custom icon components
│   │   └── OnboardingNavigator.tsx # Main onboarding logic
│   │
│   └── 📁 recording/           # Main app recording features
│       ├── MainRecordingScreen.tsx  # Primary recording interface
│       ├── RecordingButton.tsx      # Recording button component
│       ├── Waveform.tsx            # Audio waveform visualization
│       ├── RecentEntries.tsx       # List of past recordings
│       ├── RecordingSavedScreen.tsx # Save confirmation
│       └── RecordingApp.tsx        # Main app container
│
├── 📁 types/                   # TypeScript type definitions
│   ├── onboarding.ts              # Onboarding flow types
│   └── recording.ts               # Recording app types
│
├── 📄 App.tsx                  # Root application component
├── 📄 package.json             # Dependencies and scripts
└── 📄 tailwind.config.js       # Styling configuration
```

## 🔧 Key Technologies

- **React Native** - Mobile app framework
- **Expo** - Development platform and build tools
- **TypeScript** - Type safety and better developer experience
- **NativeWind** - Tailwind CSS for React Native styling
- **React Native Reanimated** - Smooth animations

## 📲 App Flow

### 1. Onboarding Sequence

1. **Welcome Screen** - Brand introduction with animated dots
2. **Name Input** - User enters their name
3. **Participant ID** - Research participant identification
4. **Personalized Welcome** - Greeting with user's name
5. **How It Works (3 screens)**:
   - Capture moments that linger in your mind
   - Speak your thoughts - no need to type
   - Reflect on your day later with clarity
6. **Permission Request** - Microphone access

### 2. Recording Experience

1. **Main Screen** - Shows thoughtful prompt and record button
2. **Recording States**:
   - Idle: Light blue button, shows question
   - Recording: Filled blue button, timer starts
   - Active: Waveform visualization appears
3. **Save Confirmation** - "Recording saved" with checkmark
4. **Recent Entries** - List of past recordings with timestamps

## 🛠️ Development

### Adding New Features

1. **New Onboarding Screen**: Add to `components/onboarding/` and update the navigator
2. **Recording Features**: Extend `components/recording/` components
3. **Types**: Update type definitions in `types/` folder

### State Management

- **Onboarding**: Managed in `OnboardingNavigator.tsx`
- **Recording**: Managed in `RecordingApp.tsx`
- **Local state**: Using React hooks (useState, useEffect)

### Styling

- Uses **NativeWind** (Tailwind CSS for React Native)
- Consistent color scheme and spacing
- Responsive design principles

## 📝 Scripts

```bash
# Development
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser

# Code Quality
npm run lint       # Run ESLint
npm run format     # Format code with Prettier

# Build
npm run prebuild   # Generate native code
```

## 🐛 Troubleshooting

### Common Issues

**Metro bundler port conflict**

```bash
npx react-native start --reset-cache --port 8082
```

**iOS simulator not opening**

```bash
npx expo run:ios --device
```

**Styling not updating**

```bash
npm start -- --clear
```
