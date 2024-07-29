# Stage 1: Build the TypeScript code
FROM node:16-alpine AS builder

# Install additional dependencies if needed
RUN apk add --no-cache libc6-compat

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies using npm ci
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript code
RUN npm run build

# Stage 2: Run the built code
FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 shakil

# Copy package files and install production dependencies using npm ci
COPY --from=builder --chown=shakil:nodejs /app/package*.json ./
RUN npm ci --only=production

# Copy the built code from the builder stage
COPY --from=builder --chown=shakil:nodejs /app/dist ./dist

# Use the non-root user
USER shakil
EXPOSE 5000

# Define the command to run the application
CMD ["node", "dist/server.js"]
