# Firebase Voice Recording App Setup

## Overview
This React Native/Expo app records voice notes with real-time sensor data (accelerometer, gyroscope, magnetometer) to detect user activity (walking, sitting, running) while recording. All data is stored in Firebase.

## Firebase Configuration

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - Authentication
   - Firestore Database
   - Storage

### 2. Set up Authentication
1. In Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider

### 3. Set up Firestore Database
1. In Firebase Console → Firestore Database
2. Create database in test mode (or production with proper rules)
3. The app will automatically create the collections as users sign up and record

### 4. Set up Storage
1. In Firebase Console → Storage
2. Create default bucket
3. Update security rules to allow authenticated users to upload:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recordings/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Get Firebase Configuration
1. In Firebase Console → Project settings → General
2. Scroll down to "Your apps" and click "Add app" → Web
3. Copy the configuration object

### 6. Update App Configuration
Replace the placeholder values in `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Data Structure

### Firestore Collections
- `/users/{uid}` - User profiles
- `/users/{uid}/recordings/{recordingId}` - Recording metadata
- `/users/{uid}/recordings/{recordingId}/sensorLogs/{logId}` - Sensor data logs

### Firebase Storage
- `/recordings/{userId}/{recordingId}/audio.m4a` - Audio files

### Sensor Data Collected
- **Accelerometer**: X, Y, Z acceleration (m/s²)
- **Gyroscope**: X, Y, Z rotation rate (rad/s)
- **Magnetometer**: X, Y, Z magnetic field (μT)

### Activity Detection
- **Sitting**: Low movement, ~1g acceleration
- **Standing**: Similar to sitting but with small variations
- **Walking**: Moderate periodic movement patterns
- **Running**: High acceleration with high frequency patterns

## Running the App

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on device/simulator:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## App Flow

1. **Authentication**: User signs up/logs in
2. **Onboarding**: User provides name and participant ID
3. **Recording**: 
   - Tap record button
   - Audio recording starts
   - Sensor data collection begins
   - Real-time waveform visualization
   - Activity detection in background
4. **Saving**: 
   - Audio uploaded to Firebase Storage
   - Metadata and sensor logs saved to Firestore
   - Activity summary generated

## Development Notes

- Sensors sample at 10Hz (configurable)
- Audio recorded at 44.1kHz
- Activity detection uses simple thresholds (can be enhanced with ML)
- Real-time Firebase sync for recordings list
- Proper error handling and loading states

## Testing

Test the app on a physical device to verify:
- Audio recording permissions
- Sensor data collection
- Firebase authentication
- File uploads to Storage
- Real-time activity detection

## Security Considerations

- Firebase security rules restrict access to user's own data
- Audio files are private to each user
- Sensor data is associated with specific recordings
- User authentication required for all operations