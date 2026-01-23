import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import healthRoutes from './routes/health.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import usageRoutes from './routes/usage.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import clientPortalRoutes from './routes/client-portal.routes.js';
import locationsRoutes from './routes/locations.routes.js';
import techniciansRoutes from './routes/technicians.routes.js';
import organizationsRoutes from './routes/organizations.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import eventsRoutes from './routes/events.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/auth', authRoutes);

// Start
app.listen(PORT, () => {
    console.log(`🚀 Omnia Backend running on port ${PORT}`);
});

export default app;
