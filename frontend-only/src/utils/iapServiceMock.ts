// Mock IAP Service for testing without native modules
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: 'premium_monthly',
  YEARLY: 'premium_yearly'
} as const;

export type SubscriptionProduct = typeof SUBSCRIPTION_PRODUCTS[keyof typeof SUBSCRIPTION_PRODUCTS];

// Mock IAP Service for testing
class IAPServiceMock {
  private isConnected = false;
  private products: any[] = [];

  // Initialize IAP connection
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 [MOCK] Initializing IAP connection...');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      console.log('✅ [MOCK] IAP connected successfully');
      
      return true;
    } catch (error) {
      console.error('❌ [MOCK] Failed to initialize IAP:', error);
      return false;
    }
  }

  // Get available products
  async getProducts(): Promise<any[]> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛍️ [MOCK] Fetching products...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock products
      this.products = [
        {
          productId: SUBSCRIPTION_PRODUCTS.MONTHLY,
          price: '4.99',
          currency: 'USD',
          title: 'Premium Monthly',
          description: 'Monthly premium subscription'
        },
        {
          productId: SUBSCRIPTION_PRODUCTS.YEARLY,
          price: '39.99',
          currency: 'USD',
          title: 'Premium Yearly',
          description: 'Yearly premium subscription'
        }
      ];
      
      console.log('✅ [MOCK] Products fetched:', this.products);
      return this.products;
    } catch (error) {
      console.error('❌ [MOCK] Error fetching products:', error);
      return [];
    }
  }

  // Purchase a subscription
  async purchaseSubscription(productId: SubscriptionProduct): Promise<{
    success: boolean;
    error?: string;
    purchase?: any;
  }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛒 [MOCK] Purchasing subscription:', productId);
      
      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful purchase
      const purchase = {
        productId,
        transactionId: `mock_transaction_${Date.now()}`,
        purchaseDate: new Date().toISOString(),
        transactionReceipt: 'mock_receipt_data'
      };
      
      console.log('✅ [MOCK] Purchase successful:', purchase);
      
      return { success: true, purchase };
    } catch (error) {
      console.error('❌ [MOCK] Purchase error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Restore purchases
  async restorePurchases(): Promise<{
    success: boolean;
    error?: string;
    restoredPurchases?: any[];
  }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🔄 [MOCK] Restoring purchases...');
      
      // Simulate restore delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock no restored purchases
      console.log('✅ [MOCK] No purchases to restore');
      
      return { success: true, restoredPurchases: [] };
    } catch (error) {
      console.error('❌ [MOCK] Error restoring purchases:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Disconnect from IAP
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        this.isConnected = false;
        console.log('🔌 [MOCK] IAP disconnected');
      }
    } catch (error) {
      console.error('❌ [MOCK] Error disconnecting IAP:', error);
    }
  }

  // Get product details by ID
  getProductById(productId: string): any | undefined {
    return this.products.find(product => product.productId === productId);
  }

  // Check if user has active subscription
  async hasActiveSubscription(): Promise<boolean> {
    // Mock - always return false for testing
    return false;
  }
}

// Export singleton instance
export const iapService = new IAPServiceMock();
