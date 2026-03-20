const MESSAGES = {
    REQUIRED_FIELDS: 'All fields are required',
    USER_EXISTS: 'User already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    LOGOUT_SUCCESS: 'Logged out successfully',
    SERVER_ERROR: 'Something went wrong',

    // NEW
    INVALID_AMOUNT: 'Invalid amount',
    PAYMENT_INTENT_FAILED: 'Failed to create payment intent',
    FETCH_TRANSACTIONS_FAILED: 'Failed to fetch transactions',

    SUBSCRIPTION_REQUIRED_FIELDS: 'Price ID and Plan Name are required',
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
    NO_ACTIVE_SUBSCRIPTION: 'No active subscription found',
    SUBSCRIPTION_CREATION_FAILED: 'Failed to create subscription',
    SUBSCRIPTION_CANCEL_FAILED: 'Failed to cancel subscription',
    SUBSCRIPTION_CANCEL_SUCCESS: 'Subscription canceled successfully',

    WEBHOOK_SIGNATURE_FAILED: 'Webhook signature verification failed',
    WEBHOOK_PROCESSING_FAILED: 'Error processing webhook',
    WEBHOOK_RECEIVED: 'Webhook received successfully'
};

module.exports = MESSAGES;