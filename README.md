NOTE : This readme is generated with help of AI

# Tickete Inventory Integration Service

A robust NestJS application for seamlessly integrating with the Tickete Inventory API, providing a reliable inventory management system for activity booking platforms.

## Overview

This service fetches inventory data from the Tickete API and stores it in a normalized database structure. It provides API endpoints for retrieving available slots and dates, with smart caching and periodic refreshing of data to ensure up-to-date information while respecting rate limits.

## Features

- **Inventory Synchronization**: Automatically fetch and store inventory data from external Tickete API
- **Normalized Database**: Efficient storage with minimized data duplication
- **REST API**: Clean endpoints for accessing inventory data
- **Smart Caching**: Intelligent refresh intervals based on time horizons
- **Rate Limit Handling**: Built-in protection against API rate limiting
- **Multi-Product Support**: Handles multiple product types with different availability patterns

## Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API Communication**: Axios
- **Scheduling**: NestJS Schedule
- **Error Handling**: Global exception filters

## Getting Started

### Prerequisites

- Node.js (v16.x or higher)
- npm or yarn
- PostgreSQL database (or SQLite for local development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/tickete-integration.git
cd tickete-integration
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/tickete_inventory?schema=public"
# For SQLite use: DATABASE_URL="file:./dev.db"

# API Configuration
API_KEY="your-tickete-api-key"
```

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Run database migrations:

```bash
npx prisma migrate dev --name init
```

### Running the Application

#### Development Mode

```bash
npm run start:dev
```

#### Production Mode

```bash
npm run build
npm run start:prod
```

## API Documentation

### Get Available Dates

Retrieve all available dates for a product for the next 2 months.

```
GET /api/v1/experience/:id/dates
```

**Parameters:**
- `id` (path parameter): Product ID

**Response:**
```json
{
  "dates": [
    {
      "date": "20250325",
      "price": {
        "finalPrice": 32,
        "originalPrice": 32,
        "currencyCode": "GBP"
      }
    },
    ...
  ]
}
```

### Get Available Slots

Retrieve all available time slots for a product on a specific date.

```
GET /api/v1/experience/:id/slots?date=:date
```

**Parameters:**
- `id` (path parameter): Product ID
- `date` (query parameter): Date in YYYYMMDD format

**Response:**
```json
{
  "slots": [
    {
      "startTime": "11:00",
      "startDate": "20250325",
      "price": {
        "finalPrice": 74.8,
        "originalPrice": 74.8,
        "currencyCode": "GBP"
      },
      "remaining": 1020,
      "paxAvailability": [
        {
          "type": "ADULT_P_16~99",
          "name": "Adult",
          "description": "16-99 years",
          "price": {
            "finalPrice": 74.8,
            "originalPrice": 74.8,
            "currencyCode": "GBP"
          },
          "min": 0,
          "max": 20,
          "remaining": 1020
        },
        ...
      ]
    },
    ...
  ]
}
```

## Database Schema

The database uses a normalized schema to efficiently store inventory data:

- **Product**: Base product information
- **Availability**: Available dates for each product
- **TimeSlot**: Time slots available on specific dates
- **PaxType**: Types of participants (Adult, Child, etc.)
- **PaxAvailability**: Availability and pricing for each participant type

## Periodic Data Refreshing

The service automatically refreshes inventory data based on time horizons:

- Every day: Fetch availability for the next 30 days
- Every 4 hours: Fetch availability for the next 7 days
- Every 15 minutes: Fetch availability for today

## Deployment

### Render

1. Create a new Web Service in Render
2. Connect your GitHub repository
3. Configure the service:
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start:prod`
   - Environment Variables: Add all required variables from `.env`

### Vercel

1. Import your project in Vercel
2. Configure environment variables
3. Deploy

## Development

### Project Structure

```
src/
├── app.module.ts             # Main application module
├── main.ts                   # Application entry point
├── config/                   # Configuration settings
├── external-api/             # External API integration
├── scheduler/                # Periodic tasks
├── database/                 # Database models and service
├── modules/
│   └── inventory/            # Inventory module
│       ├── inventory.controller.ts
│       ├── inventory.service.ts
│       └── dto/
└── utils/                    # Utility functions
```

### Adding New Products

To add new products to the system:

1. Add the product ID to the database
2. Configure any product-specific handling in the scheduler

```typescript
// Example: Adding a new product
await prisma.product.create({
  data: {
    id: 16, // New product ID
  },
});
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

[MIT License](LICENSE)

## Acknowledgements

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Tickete API Documentation](https://docs.tickete.co/)