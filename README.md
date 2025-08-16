# Event - iOS Event Discovery App

A modern iOS application for discovering events happening around you. Built with React Native, Expo, and TypeScript, featuring an interactive map as the central element.

## Features

- 🗺️ **Interactive Map**: Central map view with event markers
- 📍 **Location-based Discovery**: Find events near your current location
- 🎯 **Smart Filtering**: Filter events by category, price, date, and radius
- ⚙️ **Event Management**: Create, edit, and delete events through settings
- 📥 **Data Import**: Import events from CSV files with automatic category detection
- 📱 **iOS Native App**: Built specifically for iOS with native performance
- 🎨 **Beautiful UI**: Modern design with smooth animations and transitions
- 🔍 **Event Details**: Comprehensive event information and booking
- 📊 **Real-time Data**: Mock data structure ready for real API integration

## Tech Stack

- **Frontend**: React Native + TypeScript
- **Framework**: Expo SDK 53
- **Maps**: React Native Maps
- **Navigation**: React Navigation
- **Date Handling**: date-fns
- **Storage**: AsyncStorage
- **Platform**: iOS

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for testing)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd event
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open iOS Simulator or scan QR code with Expo Go app

### Building for Production

```bash
npm run build:ios
```

This will create an iOS build ready for App Store submission.

## Project Structure

```
src/
├── components/          # React Native components
│   ├── MapViewNative.tsx # Main iOS map interface
│   ├── UserProfile.tsx   # User profile component
│   └── ErrorBoundary.tsx # Error handling component
├── context/            # React context
│   └── EventContext.tsx # Event state management
├── utils/              # Utility functions
├── data/               # Data files
├── App.tsx             # Main app component
└── index.js            # Expo entry point
```

## Features in Detail

### Map Interface
- Interactive map with Apple Maps integration
- Custom colored markers for different event categories
- Tap markers to view event details
- Automatic location detection with GPS

### Event Discovery
- Browse events in a native iOS interface
- Filter by category (Music, Food, Sports, Art, Business, Other)
- Filter by price range and date
- Adjust search radius
- Real-time filtering and sorting

### Event Details
- Comprehensive event information
- Location details with map integration
- Attendee count and capacity
- Contact and booking options
- Share and favorite functionality

### Event Management
- Create new events with detailed information
- Edit existing events with full form validation
- Delete events with confirmation
- Search and filter events by category
- View all events in a comprehensive list

### Data Import
- Import events from CSV files
- Automatic category detection based on keywords
- Preview events before importing
- Configurable category mapping
- Support for Estonian CSV format (Kuupäev, Algusaeg, Lõpuaeg, Üritus, Asukoht, Laiuskraad, Pikkuskraad)
- Drag and drop file upload
- Sample CSV download for reference

### Mobile Optimization
- Touch-friendly interface
- iOS-style bottom sheets and modals
- Safe area handling for notched devices
- Responsive design for all screen sizes

## Mock Data

The app includes sample events in NYC with the following categories:
- 🎵 Music events
- 🍕 Food & drink festivals
- ⚽ Sports tournaments
- 🎨 Art exhibitions
- 💼 Business networking
- 📅 Other events

## Converting to Native App

This web app is designed to be easily converted to a native mobile app using:

### React Native
- Replace `react-leaflet` with `react-native-maps`
- Convert Tailwind classes to React Native styles
- Use `react-native-router-flux` for navigation

### Capacitor/Cordova
- Minimal changes required
- Add native plugins for geolocation and maps
- Package as iOS/Android app

### Progressive Web App (PWA)
- Add service worker for offline functionality
- Implement push notifications
- Add to home screen capability

## Customization

### Adding New Event Categories
1. Update the `Event` interface in `EventContext.tsx`
2. Add category colors and icons in components
3. Update filter options in `FilterModal.tsx`

### Styling
- Modify `tailwind.config.js` for custom colors and themes
- Update component styles in `index.css`
- Customize animations and transitions

### API Integration
- Replace mock data in `EventContext.tsx` with API calls
- Add loading states and error handling
- Implement real-time updates

## Browser Testing

The app is fully functional in web browsers and includes:
- Geolocation API for location detection
- Touch events for mobile interaction
- Responsive design for desktop and mobile
- Modern browser features (backdrop blur, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or support, please open an issue in the repository.
