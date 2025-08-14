# WhtzUp - Event Discovery App

A modern, mobile-first web application for discovering events happening around you. Built with React, TypeScript, and Tailwind CSS, featuring an interactive map as the central element.

## Features

- 🗺️ **Interactive Map**: Central map view with event markers
- 📍 **Location-based Discovery**: Find events near your current location
- 🎯 **Smart Filtering**: Filter events by category, price, date, and radius
- ⚙️ **Event Management**: Create, edit, and delete events through settings
- 📱 **Mobile-First Design**: Optimized for mobile devices with iOS-like UI
- 🎨 **Beautiful UI**: Modern design with smooth animations and transitions
- 🔍 **Event Details**: Comprehensive event information and booking
- 📊 **Real-time Data**: Mock data structure ready for real API integration

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + React-Leaflet
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whtzup
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── MapView.tsx     # Main map interface
│   ├── EventList.tsx   # Event list bottom sheet
│   ├── EventDetail.tsx # Event detail page
│   ├── FilterModal.tsx # Filter interface
│   └── Settings.tsx    # Event management interface
├── context/            # React context
│   └── EventContext.tsx # Event state management
├── App.tsx             # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles
```

## Features in Detail

### Map Interface
- Interactive map with OpenStreetMap tiles
- Custom colored markers for different event categories
- Click markers to view event details
- Automatic location detection (with fallback to NYC)

### Event Discovery
- Browse events in a bottom sheet interface
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
