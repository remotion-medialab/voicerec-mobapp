# Deployment Guide

## AWS Amplify Deployment

### Prerequisites

- AWS Amplify Console access
- GitHub repository connected
- Firebase project configured

### Setup Steps

1. **Connect Repository**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Connect your GitHub repository
   - Select the main branch

2. **Configure Build Settings**
   - The `amplify.yml` file is already configured
   - Build settings will be automatically detected

3. **Environment Variables**
   Set these in Amplify Console → App settings → Environment variables:

   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Deploy**
   - Amplify will automatically build and deploy on push to main branch
   - Monitor build logs in the Amplify Console

### Build Process

1. **PreBuild**: Install Node.js 18 and dependencies
2. **Build**: Run `npm run web` to build web version
3. **Artifacts**: Serve from `web-build` directory

## Alternative Deployment Options

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify Deployment

```bash
# Build the app
npm run build:web

# Deploy to Netlify
# Upload the web-build folder to Netlify
```

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase hosting
firebase init hosting

# Build and deploy
npm run build:web
firebase deploy
```

## Environment Configuration

### Development

- Uses default Firebase config in `config/firebase.ts`
- No environment variables required

### Production

- Set environment variables in deployment platform
- Firebase config will use environment variables if available
- Falls back to default config if not set

## Troubleshooting

### Common Issues

1. **Build Fails on Amplify**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Firebase Connection Issues**
   - Verify environment variables are set correctly
   - Check Firebase project settings
   - Ensure proper Firebase rules are configured

3. **Web Build Issues**
   - Clear cache: `npm start -- --clear`
   - Rebuild: `npm run build:web`
   - Check for platform-specific code

### Performance Optimization

1. **Bundle Size**
   - Use dynamic imports for large components
   - Optimize images and assets
   - Enable tree shaking

2. **Loading Speed**
   - Implement lazy loading
   - Use CDN for static assets
   - Optimize Firebase queries

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive keys to repository
   - Use deployment platform's secret management
   - Rotate keys regularly

2. **Firebase Security**
   - Configure proper Firestore rules
   - Set up Storage security rules
   - Enable authentication requirements

3. **CORS Configuration**
   - Configure allowed origins in Firebase
   - Set up proper domain restrictions
   - Monitor for unauthorized access
