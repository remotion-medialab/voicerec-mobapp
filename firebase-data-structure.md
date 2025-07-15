### 1. Users Collection (`/users`)
```javascript
{
  uid: "firebase_auth_uid",
  email: "user@example.com",
  displayName: "John Doe",
  participantId: "P001",
  createdAt: timestamp,
  lastActive: timestamp,
  settings: {
    notificationsEnabled: true,
    autoSync: true
  }
}
```

### 2. Recordings Collection (`/users/{uid}/recordings`)
```javascript
{
  recordingId: "auto_generated_id",
  userId: "firebase_auth_uid",
  title: "Recording at 2:30 PM",
  duration: 45.2, // seconds
  fileUrl: "gs://bucket/recordings/userId/recordingId.m4a",
  createdAt: timestamp,
  metadata: {
    location: {
      latitude: 42.3601,
      longitude: -71.0589
    },
    deviceInfo: {
      platform: "ios",
      model: "iPhone 14",
      osVersion: "17.0"
    }
  },
  activitySummary: {
    primaryActivity: "walking", // walking, sitting, standing, running
    confidence: 0.85,
    transitions: [
      {
        from: "sitting",
        to: "walking",
        timestamp: timestamp
      }
    ]
  }
}
```

### 3. Sensor Logs Collection (`/users/{uid}/recordings/{recordingId}/sensorLogs`)
```javascript
{
  logId: "auto_generated_id",
  timestamp: timestamp,
  sensors: {
    accelerometer: {
      x: -0.0234,
      y: 0.9876,
      z: 0.0123
    },
    gyroscope: {
      x: 0.0012,
      y: -0.0034,
      z: 0.0056
    },
    magnetometer: {
      x: 23.45,
      y: -45.67,
      z: 12.34
    }
  },
  derivedMetrics: {
    magnitude: 0.9878, // sqrt(x² + y² + z²)
    activity: "walking",
    confidence: 0.82
  }
}
```

## Firebase Storage Structure

```
/recordings
  /{userId}
    /{recordingId}
      /audio.m4a          // The actual audio file
      /waveform.json      // Pre-computed waveform data
      /thumbnail.png      // Optional waveform thumbnail
```

## Sensor Data Details

The app collects data from three core sensors. The accelerometer, measured in meters per second squared (m/s²), captures motion across three axes: the X-axis reflects left and right movement, the Y-axis tracks vertical motion (up and down), and the Z-axis detects movement forward and backward. This data is essential for identifying movement patterns, step detection, and understanding the phone’s orientation.

The gyroscope, which measures angular velocity in radians per second (rad/s), helps detect how the device tilts or rotates. Specifically, the X-axis corresponds to pitch (tilting forward or backward), the Y-axis to roll (tilting left or right), and the Z-axis to yaw (rotating left or right). This is particularly useful for assessing stability and directional changes during movement.

The magnetometer, measured in microteslas (μT), records the magnetic field strength along the X, Y, and Z axes. It primarily supports determining compass direction and helps distinguish between indoor and outdoor settings.

When it comes to activity detection, we use specific patterns in the sensor data. For instance, walking is identified when the accelerometer shows a magnitude between 0.8 and 1.5 m/s², typically with a repeating pattern, and accompanied by small rotational movements detected by the gyroscope. If the accelerometer reads close to 0.98 m/s², which reflects the static pull of gravity, and both the gyroscope and magnetometer show minimal variation, we classify the user as sitting. On the other hand, running involves higher accelerometer magnitudes—usually above 1.5 m/s²—along with rapid, periodic motion and pronounced gyroscope activity. Standing looks quite similar to sitting, but with subtle shifts in balance, reflected in occasional changes in sensor readings.

To balance data quality and device performance, we sample audio at 44.1 kHz, which is standard for high-quality recording. Sensor data is captured at 10 to 20 Hz, and we can tweak this based on battery constraints.

In terms of data retention, audio recordings are stored indefinitely in Firebase Storage. Sensor logs, however, are aggregated after seven days to conserve space, while metadata (like titles, durations, and activity summaries) is kept permanently in Firestore.