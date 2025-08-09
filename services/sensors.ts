import {
  Accelerometer,
  Gyroscope,
  Magnetometer,
  AccelerometerMeasurement,
  GyroscopeMeasurement,
  MagnetometerMeasurement,
} from 'expo-sensors';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface SensorReading {
  timestamp: number;
  accelerometer?: AccelerometerMeasurement;
  gyroscope?: GyroscopeMeasurement;
  magnetometer?: MagnetometerMeasurement;
}

export interface SensorLog {
  timestamp: any;
  sensors: {
    accelerometer?: {
      x: number;
      y: number;
      z: number;
    };
    gyroscope?: {
      x: number;
      y: number;
      z: number;
    };
    magnetometer?: {
      x: number;
      y: number;
      z: number;
    };
  };
  derivedMetrics: {
    magnitude: number;
    activity: string;
    confidence: number;
  };
}

export type ActivityType = 'sitting' | 'standing' | 'walking' | 'running' | 'unknown';

class SensorService {
  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private magnetometerSubscription: any = null;

  private sensorBuffer: SensorReading[] = [];
  private isRecording: boolean = false;
  // New: track session and step for Firestore pathing
  private currentSessionNumber: number | null = null;
  private currentStepNumber: number | null = null; // 1..5

  private lastAccelerometer: AccelerometerMeasurement | null = null;
  private lastGyroscope: GyroscopeMeasurement | null = null;
  private lastMagnetometer: MagnetometerMeasurement | null = null;

  // Set update interval for sensors (in milliseconds)
  private updateInterval = 100; // 10Hz

  // Start recording sensor data
  async startRecording(sessionNumber: number, stepNumber: number): Promise<void> {
    this.currentSessionNumber = sessionNumber;
    this.currentStepNumber = stepNumber;
    this.isRecording = true;
    this.sensorBuffer = [];

    // Set sensor update intervals
    await Accelerometer.setUpdateInterval(this.updateInterval);
    await Gyroscope.setUpdateInterval(this.updateInterval);
    await Magnetometer.setUpdateInterval(this.updateInterval);

    // Subscribe to accelerometer
    this.accelerometerSubscription = Accelerometer.addListener((data) => {
      this.lastAccelerometer = data;
      this.addReading();
    });

    // Subscribe to gyroscope
    this.gyroscopeSubscription = Gyroscope.addListener((data) => {
      this.lastGyroscope = data;
      this.addReading();
    });

    // Subscribe to magnetometer
    this.magnetometerSubscription = Magnetometer.addListener((data) => {
      this.lastMagnetometer = data;
      this.addReading();
    });
  }

  // Stop recording sensor data
  async stopRecording(): Promise<void> {
    this.isRecording = false;

    // Unsubscribe from sensors
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }
    if (this.magnetometerSubscription) {
      this.magnetometerSubscription.remove();
      this.magnetometerSubscription = null;
    }

    // Save remaining buffer to Firebase
    if (this.sensorBuffer.length > 0 && this.currentSessionNumber && this.currentStepNumber) {
      await this.saveSensorLogs();
    }

    this.currentSessionNumber = null;
    this.currentStepNumber = null;
  }

  // Add sensor reading to buffer
  private addReading(): void {
    if (!this.isRecording) return;

    const reading: SensorReading = {
      timestamp: Date.now(),
      accelerometer: this.lastAccelerometer || undefined,
      gyroscope: this.lastGyroscope || undefined,
      magnetometer: this.lastMagnetometer || undefined,
    };

    this.sensorBuffer.push(reading);

    // Save to Firebase every 10 seconds (100 readings at 10Hz)
    if (this.sensorBuffer.length >= 100) {
      this.saveSensorLogs();
    }
  }

  // Save sensor logs to Firebase
  private async saveSensorLogs(): Promise<void> {
    if (!this.currentSessionNumber || !this.currentStepNumber || this.sensorBuffer.length === 0) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      const logsToSave = [...this.sensorBuffer];
      this.sensorBuffer = [];

      // New sequential path: users/{uid}/sessions/{N}/recordings/step-{S}/sensorLogs
      const sensorLogsRef = collection(
        db,
        'users',
        user.uid,
        'sessions',
        `session${this.currentSessionNumber}`,
        'recordings',
        `step-${this.currentStepNumber}`,
        'sensorLogs'
      );

      const promises = logsToSave.map(async (reading) => {
        const activity = this.detectActivity(reading);
        const magnitude = this.calculateMagnitude(reading.accelerometer);

        // Only include sensor data that exists (not undefined)
        const sensors: any = {};
        if (reading.accelerometer) {
          sensors.accelerometer = reading.accelerometer;
        }
        if (reading.gyroscope) {
          sensors.gyroscope = reading.gyroscope;
        }
        if (reading.magnetometer) {
          sensors.magnetometer = reading.magnetometer;
        }

        const log: Omit<SensorLog, 'logId'> = {
          timestamp: serverTimestamp(),
          sensors,
          derivedMetrics: {
            magnitude,
            activity: activity.type,
            confidence: activity.confidence,
          },
        };

        return addDoc(sensorLogsRef, log);
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error saving sensor logs:', error);
      // Keep data in buffer to retry later
      this.sensorBuffer = [...this.sensorBuffer, ...this.sensorBuffer];
    }
  }

  // Calculate magnitude of acceleration vector
  private calculateMagnitude(accel?: AccelerometerMeasurement): number {
    if (!accel) return 0;
    return Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  }

  // Detect activity from sensor data
  private detectActivity(reading: SensorReading): { type: ActivityType; confidence: number } {
    if (!reading.accelerometer || !reading.gyroscope) {
      return { type: 'unknown', confidence: 0 };
    }

    const accelMagnitude = this.calculateMagnitude(reading.accelerometer);
    const gyroMagnitude = this.calculateMagnitude(reading.gyroscope);

    // Simple activity detection based on thresholds
    // In production, use ML models for better accuracy

    // Sitting/Standing: Low acceleration variation, minimal gyroscope activity
    if (accelMagnitude >= 0.95 && accelMagnitude <= 1.05 && gyroMagnitude < 0.1) {
      // Differentiate sitting vs standing based on device orientation
      const isVertical = Math.abs(reading.accelerometer.z) > 0.8;
      return {
        type: isVertical ? 'standing' : 'sitting',
        confidence: 0.8,
      };
    }

    // Walking: Moderate acceleration with periodic pattern
    if (accelMagnitude >= 0.8 && accelMagnitude <= 1.5 && gyroMagnitude < 0.5) {
      return { type: 'walking', confidence: 0.7 };
    }

    // Running: High acceleration with high frequency pattern
    if (accelMagnitude > 1.5 && gyroMagnitude > 0.3) {
      return { type: 'running', confidence: 0.75 };
    }

    return { type: 'unknown', confidence: 0.3 };
  }

  // Get current activity
  getCurrentActivity(): { type: ActivityType; confidence: number } {
    const reading: SensorReading = {
      timestamp: Date.now(),
      accelerometer: this.lastAccelerometer || undefined,
      gyroscope: this.lastGyroscope || undefined,
      magnetometer: this.lastMagnetometer || undefined,
    };

    return this.detectActivity(reading);
  }

  // Check if sensors are available
  async checkSensorAvailability(): Promise<{
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  }> {
    const [accel, gyro, mag] = await Promise.all([
      Accelerometer.isAvailableAsync(),
      Gyroscope.isAvailableAsync(),
      Magnetometer.isAvailableAsync(),
    ]);

    return {
      accelerometer: accel,
      gyroscope: gyro,
      magnetometer: mag,
    };
  }

  // Get activity summary for the recording
  getActivitySummary(): {
    primaryActivity: ActivityType;
    confidence: number;
    transitions: { from: string; to: string; timestamp: number }[];
  } {
    // This would analyze the entire sensor buffer to determine primary activity
    // and detect transitions. For now, return current activity
    const current = this.getCurrentActivity();

    return {
      primaryActivity: current.type,
      confidence: current.confidence,
      transitions: [], // Would be populated by analyzing buffer
    };
  }

  // Helper method to get user profile
  private async getUserProfile(uid: string): Promise<any> {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
}

export const sensorService = new SensorService();
