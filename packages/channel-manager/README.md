# @the-rooms/channel-manager

Channel manager middleware for OTA integrations (Booking.com, Expedia, Airbnb, Agoda).

## Installation

```bash
npm install @the-rooms/channel-manager
```

## Usage

### Initialize Channel Manager

```typescript
import { ChannelManager, channelRegistry, BookingComAdapter } from '@the-rooms/channel-manager';

// Register adapters
channelRegistry.register('BOOKING_COM', BookingComAdapter);

// Configure a channel
channelRegistry.configure('BOOKING_COM', {
  apiKey: process.env.BOOKING_COM_API_KEY,
  propertyId: process.env.BOOKING_COM_PROPERTY_ID,
  hotelId: process.env.BOOKING_COM_HOTEL_ID,
  webhookSecret: process.env.BOOKING_COM_WEBHOOK_SECRET,
});

// Create manager instance
const channelManager = new ChannelManager();
```

### Execute Sync

```typescript
// Full inventory sync
const result = await channelManager.executeSync(channelId, 'FULL_INVENTORY');

// Incremental sync
const result = await channelManager.executeSync(channelId, 'INCREMENTAL_INVENTORY');

// Import bookings
const result = await channelManager.executeSync(channelId, 'BOOKING_IMPORT');
```

### Test Connection

```typescript
const { success, message } = await channelManager.testConnection(channelId);
```

### Webhook Handling

```typescript
import { WebhookRouter, BookingWebhookHandler } from '@the-rooms/channel-manager';

const webhookRouter = new WebhookRouter();
webhookRouter.registerHandler('BOOKING_COM', new BookingWebhookHandler());

// In your webhook API route
app.post('/api/channels/webhooks', async (req, res) => {
  const { status, webhookId } = await webhookRouter.route(
    'BOOKING_COM',
    req.body,
    req.headers['x-webhook-signature'],
    req.headers
  );
  res.json({ status, webhookId });
});
```

## Architecture

```
packages/channel-manager/
├── src/
│   ├── types/           # Type definitions
│   ├── interfaces/      # Channel adapter interfaces
│   ├── core/           # SyncEngine, ChannelManager, ConflictResolver
│   ├── adapters/       # Base adapter implementation
│   ├── channels/       # OTA-specific adapters
│   ├── webhooks/       # Webhook handlers
│   └── utils/          # Utilities
```

## Sync Modes

- **PUSH_BASED**: PMS pushes updates to OTA
- **PULL_BASED**: PMS pulls from OTA periodically
- **WEBHOOK_BASED**: OTA pushes changes via webhooks
- **HYBRID**: Combination of push/pull/webhook

## Conflict Resolution

- **PMS_WINS**: PMS data takes precedence (default)
- **OTA_WINS**: OTA data takes precedence
- **NEWEST_WINS**: Most recent update wins
- **MANUAL**: Requires manual resolution

## Database Schema

Add the channel manager models to your Prisma schema:

```prisma
// Copy contents of packages/db/prisma/channel-manager-schema.prisma
// into your main schema.prisma file
```

Then run migration:

```bash
npx prisma migrate dev --name add_channel_manager
```

## API Routes

See `plans/channel-manager-architecture.md` for complete API route documentation.

## License

Proprietary - The Rooms App
