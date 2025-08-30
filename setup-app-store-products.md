# 🍎 App Store Connect Subscription Products Setup

## 1. App Store Connect Seadistamine

### 1.1 Mine App Store Connect
- Ava: https://appstoreconnect.apple.com
- Logi sisse oma Apple Developer kontoga

### 1.2 Lisa Subscription Products

#### Samm 1: Mine My Apps
- Vali "My Apps"
- Vali "Event Discovery" app

#### Samm 2: Lisa Subscription Group
- Mine "Features" → "In-App Purchases"
- Kliki "+" → "Create New"
- Vali "Auto-Renewable Subscription"
- Nimi: "Premium Subscriptions"

#### Samm 3: Lisa Subscription Products

**Premium Monthly:**
- Product ID: `premium_monthly`
- Reference Name: "Premium Monthly"
- Subscription Group: "Premium Subscriptions"
- Subscription Duration: 1 Month
- Price: $4.99 USD
- Localization:
  - Display Name: "Premium Monthly"
  - Description: "Unlock unlimited events, advanced search, analytics, and premium features"

**Premium Yearly:**
- Product ID: `premium_yearly`
- Reference Name: "Premium Yearly"
- Subscription Group: "Premium Subscriptions"
- Subscription Duration: 1 Year
- Price: $39.99 USD
- Localization:
  - Display Name: "Premium Yearly"
  - Description: "Unlock unlimited events, advanced search, analytics, and premium features"

### 1.3 Seadista Pricing

#### Premium Monthly:
- Base Price: $4.99 USD
- All regions: Auto-calculate based on base price

#### Premium Yearly:
- Base Price: $39.99 USD
- All regions: Auto-calculate based on base price

### 1.4 Seadista Availability
- Status: "Ready to Submit"
- Availability: All territories
- Review Information: Add screenshots and descriptions

## 2. Testimine

### 2.1 Sandbox Testimine
1. Lisa sandbox test kasutaja App Store Connect-is
2. Testi rakenduses sandbox keskkonnas
3. Kontrolli receipt validation

### 2.2 TestFlight Testimine
1. Lisa TestFlight kasutajad
2. Testi päris subscription flow
3. Kontrolli backend receipt validation

## 3. Production

### 3.1 Submit Subscription Products
1. Submit subscription products for review
2. Oota Apple review (1-3 päeva)
3. Pärast approval, subscription on saadaval

### 3.2 Monitorimine
- App Store Connect Analytics
- Revenue tracking
- Subscription metrics

## 4. Koodi Kontroll

### 4.1 Product ID-d
Veendu, et koodis kasutad õigeid Product ID-sid:
```typescript
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: 'premium_monthly',
  YEARLY: 'premium_yearly'
} as const;
```

### 4.2 Receipt Validation
Backend valideerib receipt-id Apple serveritega:
- Production: https://buy.itunes.apple.com/verifyReceipt
- Sandbox: https://sandbox.itunes.apple.com/verifyReceipt

### 4.3 Error Handling
Kontrolli, et kood käsitleb kõiki võimalikke veateid:
- Network errors
- Invalid receipts
- Expired subscriptions
- Cancelled subscriptions

## 5. Järgmised Sammud

1. **Lisa subscription products App Store Connect-is**
2. **Testi sandbox keskkonnas**
3. **Submit for review**
4. **Deploy to TestFlight**
5. **Monitor and optimize**

## 6. Kasulikud Lingid

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [In-App Purchase Configuration](https://developer.apple.com/documentation/storekit/in-app_purchase)
- [Receipt Validation](https://developer.apple.com/documentation/appstorereceipts)
- [Subscription Best Practices](https://developer.apple.com/app-store/subscriptions/)
