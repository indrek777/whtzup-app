#!/bin/bash

echo "Starting Expo in Go mode for iOS..."
echo "Press 's' when prompted to switch to Expo Go"

# Start expo and pipe 's' to switch to Expo Go mode
(echo "s"; sleep 2) | npx expo start --clear --lan
