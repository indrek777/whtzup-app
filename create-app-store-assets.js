#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Creating App Store Assets...\n');

// Create directories for App Store assets
const createDirectories = () => {
  const dirs = [
    'app-store-assets',
    'app-store-assets/screenshots',
    'app-store-assets/screenshots/iphone-6.7',
    'app-store-assets/screenshots/iphone-6.5',
    'app-store-assets/screenshots/iphone-5.5',
    'app-store-assets/marketing',
    'app-store-assets/legal',
    'app-store-assets/videos'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

// Generate screenshot specifications
const generateScreenshotSpecs = () => {
  const specs = {
    'iphone-6.7': { width: 1290, height: 2796, device: 'iPhone 15 Pro Max' },
    'iphone-6.5': { width: 1242, height: 2688, device: 'iPhone 14 Plus' },
    'iphone-5.5': { width: 1242, height: 2208, device: 'iPhone 8 Plus' }
  };

  const screenshotContent = [
    {
      name: '01-main-map-view',
      title: 'Discover 13,000+ Events',
      description: 'Interactive map with colorful event markers showing different categories'
    },
    {
      name: '02-event-details',
      title: 'Detailed Event Information',
      description: 'Event detail modal with full information, ratings, and reviews'
    },
    {
      name: '03-search-filtering',
      title: 'Smart Search & Filtering',
      description: 'Search interface with category filters and advanced filtering options'
    },
    {
      name: '04-event-creation',
      title: 'Create Your Own Events',
      description: 'Event creation form with map location selection'
    },
    {
      name: '05-user-profile',
      title: 'Personalized Experience',
      description: 'User profile with subscription status and settings'
    }
  ];

  return { specs, screenshotContent };
};

// Create screenshot specifications file
const createScreenshotSpecs = () => {
  const { specs, screenshotContent } = generateScreenshotSpecs();
  
  const specContent = {
    deviceSpecs: specs,
    screenshots: screenshotContent,
    instructions: {
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      fontFamily: 'SF Pro Display',
      fontSize: '48px',
      fontWeight: 'bold',
      textPosition: 'bottom',
      textPadding: '40px'
    }
  };

  fs.writeFileSync(
    'app-store-assets/screenshot-specifications.json',
    JSON.stringify(specContent, null, 2)
  );
  
  console.log('✅ Created screenshot specifications');
};

// Create marketing copy files
const createMarketingCopy = () => {
  const marketingContent = {
    appName: 'Event Discovery - Find Local Events',
    subtitle: 'Discover events near you',
    shortDescription: 'Find and explore local events with our interactive map. Discover concerts, festivals, workshops, and more near you.',
    longDescription: fs.readFileSync('APP_STORE_PREPARATION.md', 'utf8')
      .split('### **Description**')[1]
      .split('### **What\'s New')[0]
      .trim(),
    keywords: 'events,local,discovery,map,find,activities,concerts,shows,festivals,nightlife,music,sports,art,food,business,networking,workshops,comedy,theater,family',
    features: [
      'Interactive map with 13,000+ events',
      '17 event categories',
      'Real-time location tracking',
      'Advanced search and filtering',
      'Community ratings and reviews',
      'Offline support with sync',
      'Create and share events',
      'Beautiful, intuitive design',
      'Privacy-focused and secure'
    ],
    targetAudience: [
      'Event organizers looking to promote their events',
      'Music lovers discovering concerts and festivals',
      'Sports enthusiasts finding games and tournaments',
      'Foodies exploring culinary events and tastings',
      'Business professionals networking at industry events',
      'Families finding kid-friendly activities',
      'Students discovering educational workshops',
      'Travelers exploring local culture and events'
    ]
  };

  fs.writeFileSync(
    'app-store-assets/marketing/app-store-copy.json',
    JSON.stringify(marketingContent, null, 2)
  );

  // Create individual text files for easy copying
  fs.writeFileSync('app-store-assets/marketing/app-name.txt', marketingContent.appName);
  fs.writeFileSync('app-store-assets/marketing/subtitle.txt', marketingContent.subtitle);
  fs.writeFileSync('app-store-assets/marketing/short-description.txt', marketingContent.shortDescription);
  fs.writeFileSync('app-store-assets/marketing/keywords.txt', marketingContent.keywords);
  fs.writeFileSync('app-store-assets/marketing/long-description.txt', marketingContent.longDescription);

  console.log('✅ Created marketing copy files');
};

// Create App Store Connect submission guide
const createSubmissionGuide = () => {
  const guide = `# App Store Connect Submission Guide

## 📋 Pre-Submission Checklist

### App Information
- [ ] App Name: Event Discovery - Find Local Events
- [ ] Subtitle: Discover events near you
- [ ] Bundle ID: com.eventdiscovery.app
- [ ] Version: 1.0.5
- [ ] Build Number: 7

### Screenshots Required
- [ ] iPhone 6.7" (1290 x 2796) - 5 screenshots
- [ ] iPhone 6.5" (1242 x 2688) - 5 screenshots  
- [ ] iPhone 5.5" (1242 x 2208) - 5 screenshots

### App Store Listing
- [ ] App description (long and short)
- [ ] Keywords (100 characters max)
- [ ] App icon (1024 x 1024)
- [ ] App preview video (optional)

### Legal & Compliance
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Age Rating: 4+
- [ ] Demo account credentials

## 🚀 Submission Steps

1. **Log into App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Create New App**
   - Click the "+" button
   - Select "New App"
   - Fill in app information:
     - Platform: iOS
     - Name: Event Discovery
     - Bundle ID: com.eventdiscovery.app
     - SKU: event-discovery-ios-2024
     - User Access: Full Access

3. **App Information**
   - Primary Language: English
   - Category: Events > Entertainment
   - Secondary Category: Lifestyle > Social Networking
   - Age Rating: 4+

4. **Pricing & Availability**
   - Price: Free
   - Availability: All countries
   - In-App Purchases:
     - Premium Monthly: $4.99
     - Premium Yearly: $39.99

5. **App Store Listing**
   - App Name: Event Discovery - Find Local Events
   - Subtitle: Discover events near you
   - Keywords: events,local,discovery,map,find,activities,concerts,shows,festivals,nightlife,music,sports,art,food,business,networking,workshops,comedy,theater,family
   - Description: [Use content from marketing copy]

6. **Screenshots**
   - Upload screenshots for each device size
   - Ensure screenshots show key app features
   - Add text overlays for better conversion

7. **App Review Information**
   - Demo Account:
     - Email: demo@eventdiscovery.app
     - Password: demo123
   - Notes: App requires location permission for optimal experience

8. **Submit for Review**
   - Review all information
   - Submit for App Store review
   - Monitor review status

## 📊 Post-Submission

### Monitor Review Process
- Review typically takes 1-7 days
- Check App Store Connect for status updates
- Address any issues if rejected

### Launch Preparation
- Prepare social media announcements
- Set up analytics tracking
- Prepare customer support
- Plan feature updates

## 🎯 Success Metrics

Track these metrics after launch:
- Downloads (daily, weekly, monthly)
- App Store ratings and reviews
- Category rankings
- Keyword rankings
- User retention rates
- Premium subscription conversions

Good luck with your App Store submission! 🚀
`;

  fs.writeFileSync('app-store-assets/SUBMISSION_GUIDE.md', guide);
  console.log('✅ Created submission guide');
};

// Create privacy policy and terms of service
const createLegalDocuments = () => {
  const privacyPolicy = `# Privacy Policy for Event Discovery

**Last updated: ${new Date().toISOString().split('T')[0]}**

Event Discovery ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.

## Information We Collect

### Personal Information
- **Account Information**: Email address, name when you create an account
- **Location Data**: Your location (with your permission) to show nearby events
- **Event Preferences**: Your event ratings, reviews, and preferences
- **Usage Data**: How you interact with our app to improve our service

### Technical Information
- **Device Information**: Device type, operating system, app version
- **Log Data**: App usage, error reports, performance data
- **Analytics**: Anonymous usage statistics to improve app performance

## How We Use Your Information

### Primary Uses
- **Event Discovery**: Show events near your location
- **Personalization**: Provide relevant event recommendations
- **Account Management**: Manage your user account and preferences
- **App Improvement**: Analyze usage patterns to improve our service

### Secondary Uses
- **Customer Support**: Help you with app-related issues
- **Security**: Protect against fraud and abuse
- **Legal Compliance**: Comply with applicable laws and regulations

## Data Security

### Protection Measures
- **Encryption**: All data is encrypted in transit and at rest
- **Access Control**: Limited access to personal information
- **Regular Audits**: Security assessments and updates
- **Data Minimization**: We only collect necessary information

### Data Retention
- **Account Data**: Retained while your account is active
- **Location Data**: Not stored permanently, used only for event discovery
- **Usage Data**: Anonymized and retained for app improvement
- **Deletion**: You can delete your account and data at any time

## Your Rights

### Data Access
- View your personal information
- Download your data
- Request data correction

### Data Control
- Delete your account
- Opt out of analytics
- Control location permissions
- Unsubscribe from communications

### Privacy Settings
- Manage location permissions
- Control notification preferences
- Adjust privacy settings in the app

## Third-Party Services

### Analytics
- **Firebase Analytics**: Anonymous usage statistics
- **Crashlytics**: Error reporting and app stability

### Infrastructure
- **AWS/Google Cloud**: Secure data storage and processing
- **Payment Processors**: Secure payment processing for subscriptions

## Children's Privacy

Our app is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## International Users

### GDPR Compliance (EU Users)
- Right to access, rectify, and delete personal data
- Right to data portability
- Right to object to processing
- Right to lodge complaints with supervisory authorities

### CCPA Compliance (California Users)
- Right to know what personal information is collected
- Right to delete personal information
- Right to opt out of data sales
- Right to non-discrimination

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy in the app
- Sending you an email notification
- Updating the "Last updated" date

## Contact Us

If you have questions about this Privacy Policy, please contact us:

**Email**: privacy@eventdiscovery.app
**Address**: [Your Business Address]
**Website**: https://eventdiscovery.app/privacy

## Effective Date

This Privacy Policy is effective as of ${new Date().toISOString().split('T')[0]}.
`;

  const termsOfService = `# Terms of Service for Event Discovery

**Last updated: ${new Date().toISOString().split('T')[0]}**

Welcome to Event Discovery! These Terms of Service ("Terms") govern your use of our mobile application and services.

## Acceptance of Terms

By downloading, installing, or using Event Discovery, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our app.

## Description of Service

Event Discovery is a mobile application that helps users discover, create, and share local events. Our service includes:
- Interactive map-based event discovery
- Event creation and management tools
- Community features (ratings, reviews)
- Real-time event updates and notifications

## User Accounts

### Account Creation
- You must provide accurate and complete information
- You are responsible for maintaining account security
- You must be at least 13 years old to create an account

### Account Responsibilities
- Keep your login credentials secure
- Notify us immediately of any unauthorized use
- You are responsible for all activity under your account

## Acceptable Use

### Permitted Uses
- Discover and view events
- Create and manage your own events
- Rate and review events
- Share events with others
- Use the app for personal, non-commercial purposes

### Prohibited Uses
- Violate any applicable laws or regulations
- Infringe on intellectual property rights
- Harass, abuse, or harm other users
- Post false, misleading, or inappropriate content
- Attempt to gain unauthorized access to our systems
- Use the app for commercial purposes without permission

## User-Generated Content

### Content Standards
- Content must be accurate and truthful
- Content must not be offensive, harmful, or inappropriate
- Content must not violate third-party rights
- Content must comply with applicable laws

### Content License
By posting content, you grant us a worldwide, non-exclusive license to use, display, and distribute your content in connection with our service.

### Content Moderation
We reserve the right to remove or modify content that violates these Terms or is otherwise inappropriate.

## Privacy and Data

Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms.

## Subscription Services

### Premium Features
- Premium subscription provides access to additional features
- Subscription fees are billed in advance
- Subscriptions automatically renew unless cancelled

### Payment Terms
- All fees are non-refundable except as required by law
- We may change subscription prices with notice
- Payment processing is handled by third-party providers

### Cancellation
- You may cancel your subscription at any time
- Cancellation takes effect at the end of the current billing period
- No refunds for partial billing periods

## Intellectual Property

### Our Rights
- Event Discovery and its content are protected by copyright and other laws
- Our trademarks and trade dress may not be used without permission
- We retain all rights not expressly granted to you

### Your Rights
- You retain ownership of your user-generated content
- You grant us a license to use your content as described above

## Disclaimers

### Service Availability
- We strive to provide reliable service but cannot guarantee uninterrupted access
- We may modify, suspend, or discontinue the service at any time
- We are not responsible for third-party content or services

### No Warranties
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

## Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

## Indemnification

You agree to indemnify and hold us harmless from any claims arising from your use of the service or violation of these Terms.

## Termination

### Termination by You
You may stop using the service at any time.

### Termination by Us
We may terminate or suspend your account for violations of these Terms.

### Effect of Termination
Upon termination, your right to use the service ceases immediately.

## Governing Law

These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.

## Dispute Resolution

### Informal Resolution
We encourage you to contact us first to resolve any disputes.

### Arbitration
Any disputes not resolved informally may be resolved through binding arbitration.

## Changes to Terms

We may update these Terms from time to time. We will notify you of significant changes by:
- Posting the new Terms in the app
- Sending you an email notification
- Updating the "Last updated" date

## Contact Information

If you have questions about these Terms, please contact us:

**Email**: legal@eventdiscovery.app
**Address**: [Your Business Address]
**Website**: https://eventdiscovery.app/terms

## Effective Date

These Terms of Service are effective as of ${new Date().toISOString().split('T')[0]}.
`;

  fs.writeFileSync('app-store-assets/legal/privacy-policy.md', privacyPolicy);
  fs.writeFileSync('app-store-assets/legal/terms-of-service.md', termsOfService);
  
  console.log('✅ Created legal documents');
};

// Create App Store preview video script
const createVideoScript = () => {
  const videoScript = `# App Store Preview Video Script

## Video Specifications
- **Duration**: 15-30 seconds
- **Format**: MP4
- **Resolution**: 1920x1080 (landscape) or 1080x1920 (portrait)
- **Frame Rate**: 30fps
- **Audio**: Background music + voiceover (optional)

## Video Content Outline

### Scene 1: App Launch (0-3 seconds)
- Show app icon and launch animation
- Text overlay: "Event Discovery"
- Background: Clean, modern interface

### Scene 2: Map View (3-8 seconds)
- Show interactive map with colorful event markers
- Demonstrate map interaction (zoom, pan)
- Text overlay: "Discover 13,000+ Events"
- Show different colored markers for different categories

### Scene 3: Event Discovery (8-12 seconds)
- Tap on an event marker
- Show event detail modal with information
- Text overlay: "Find Events Near You"
- Show rating stars and event details

### Scene 4: Search & Filtering (12-16 seconds)
- Show search interface with category filters
- Demonstrate filtering by category (Music, Sports, Art)
- Text overlay: "Smart Search & Filtering"
- Show search results

### Scene 5: Event Creation (16-20 seconds)
- Show event creation form
- Demonstrate adding event details
- Text overlay: "Create Your Own Events"
- Show map location selection

### Scene 6: Community Features (20-24 seconds)
- Show rating and review interface
- Demonstrate user interaction
- Text overlay: "Community Features"
- Show user profile and settings

### Scene 7: Call to Action (24-30 seconds)
- Show app icon again
- Text overlay: "Download Event Discovery"
- Include App Store badge
- Background: Clean, professional

## Voiceover Script (Optional)

"Discover amazing events happening around you with Event Discovery. 
Explore over 13,000 events on our interactive map, 
from concerts and festivals to workshops and sports. 
Find events by category, distance, or search terms. 
Create and share your own events with the community. 
Download Event Discovery today and never miss out on local events!"

## Production Notes

### Visual Style
- Clean, modern interface
- Consistent color scheme with app branding
- Smooth transitions between scenes
- Professional typography

### Audio
- Upbeat, energetic background music
- Clear, professional voiceover
- Sound effects for interactions (optional)

### Technical Requirements
- High-quality screen recordings
- Smooth animations and transitions
- Professional editing and post-production
- Optimized for mobile viewing

## File Naming Convention
- event-discovery-preview-15s.mp4
- event-discovery-preview-30s.mp4
- event-discovery-preview-landscape.mp4
- event-discovery-preview-portrait.mp4
`;

  fs.writeFileSync('app-store-assets/videos/video-script.md', videoScript);
  console.log('✅ Created video script');
};

// Create README for the assets
const createAssetsREADME = () => {
  const readme = `# App Store Assets

This directory contains all the assets needed for App Store submission.

## 📁 Directory Structure

\`\`\`
app-store-assets/
├── screenshots/           # App Store screenshots
│   ├── iphone-6.7/       # iPhone 15 Pro Max (1290x2796)
│   ├── iphone-6.5/       # iPhone 14 Plus (1242x2688)
│   └── iphone-5.5/       # iPhone 8 Plus (1242x2208)
├── marketing/            # Marketing copy and text
├── legal/               # Privacy policy and terms of service
├── videos/              # App preview video scripts
└── screenshot-specifications.json
\`\`\`

## 📱 Screenshots Required

### iPhone 6.7" (1290 x 2796)
- 01-main-map-view.png
- 02-event-details.png
- 03-search-filtering.png
- 04-event-creation.png
- 05-user-profile.png

### iPhone 6.5" (1242 x 2688)
- Same 5 screenshots as above

### iPhone 5.5" (1242 x 2208)
- Same 5 screenshots as above

## 📝 Marketing Copy

### App Store Listing
- **App Name**: Event Discovery - Find Local Events
- **Subtitle**: Discover events near you
- **Keywords**: events,local,discovery,map,find,activities,concerts,shows,festivals,nightlife,music,sports,art,food,business,networking,workshops,comedy,theater,family

### Description
Use the content from \`marketing/long-description.txt\` for the full App Store description.

## 🔒 Legal Documents

### Privacy Policy
- File: \`legal/privacy-policy.md\`
- URL: https://eventdiscovery.app/privacy

### Terms of Service
- File: \`legal/terms-of-service.md\`
- URL: https://eventdiscovery.app/terms

## 🎬 App Preview Video

### Specifications
- Duration: 15-30 seconds
- Format: MP4
- Resolution: 1920x1080 or 1080x1920
- Content: See \`videos/video-script.md\`

## 🚀 Next Steps

1. **Create Screenshots**
   - Use the specifications in \`screenshot-specifications.json\`
   - Create screenshots for all required device sizes
   - Add text overlays for better conversion

2. **Set Up Legal Pages**
   - Host privacy policy and terms of service on your website
   - Update URLs in App Store Connect

3. **Create App Preview Video**
   - Follow the script in \`videos/video-script.md\`
   - Record high-quality screen captures
   - Add professional editing and audio

4. **Submit to App Store**
   - Follow the guide in \`SUBMISSION_GUIDE.md\`
   - Upload all assets to App Store Connect
   - Submit for review

## 📊 Success Tips

### Screenshots
- Show the most important features first
- Use text overlays to highlight key benefits
- Ensure screenshots are visually appealing
- Test different text and color combinations

### Description
- Start with a compelling hook
- Use bullet points for easy scanning
- Include relevant keywords naturally
- Highlight unique features and benefits

### Keywords
- Research competitor keywords
- Use App Store optimization tools
- Include long-tail keywords
- Update keywords based on performance

### Video
- Keep it short and engaging
- Show real app functionality
- Use professional audio and visuals
- Include a clear call to action

Good luck with your App Store submission! 🎉
`;

  fs.writeFileSync('app-store-assets/README.md', readme);
  console.log('✅ Created assets README');
};

// Main execution
const main = () => {
  console.log('🎨 Creating App Store Assets...\n');
  
  createDirectories();
  createScreenshotSpecs();
  createMarketingCopy();
  createSubmissionGuide();
  createLegalDocuments();
  createVideoScript();
  createAssetsREADME();
  
  console.log('\n🎉 App Store assets created successfully!');
  console.log('\n📋 Next Steps:');
  console.log('1. Create actual screenshot images using the specifications');
  console.log('2. Set up privacy policy and terms of service websites');
  console.log('3. Create app preview video following the script');
  console.log('4. Submit to App Store Connect using the submission guide');
  console.log('\n📁 All assets are in the "app-store-assets" directory');
};

main();
