#!/bin/bash

# Script to update all API URLs to Digital Ocean server

echo "🔧 Updating API URLs to Digital Ocean server..."

# Update all service files
echo "📝 Updating service files..."

# syncService.ts
sed -i '' 's|http://localhost:4000|http://165.22.90.180:4000|g' src/utils/syncService.ts

# userService.ts
sed -i '' 's|http://localhost:4000/api|http://165.22.90.180:4000/api|g' src/utils/userService.ts

# eventService.ts
sed -i '' 's|http://localhost:4000/api|http://165.22.90.180:4000/api|g' src/utils/eventService.ts

# eventRegistrationService.ts
sed -i '' 's|http://localhost:4000/api|http://165.22.90.180:4000/api|g' src/utils/eventRegistrationService.ts

# ratingService.ts
sed -i '' 's|http://localhost:4000/api|http://165.22.90.180:4000/api|g' src/utils/ratingService.ts

echo "✅ All API URLs updated to Digital Ocean server!"
echo ""
echo "📋 Updated files:"
echo "- src/utils/syncService.ts"
echo "- src/utils/userService.ts"
echo "- src/utils/eventService.ts"
echo "- src/utils/eventRegistrationService.ts"
echo "- src/utils/ratingService.ts"
echo ""
echo "🚀 Next steps:"
echo "1. Test the connection: curl http://165.22.90.180:4000/api/health"
echo "2. Push changes to GitHub: git add . && git commit -m 'Update API URLs to Digital Ocean' && git push"
echo "3. Test the app with new backend"
