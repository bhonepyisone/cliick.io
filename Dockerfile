FROM node:20-alpine

WORKDIR /app

# Copy all backend files (including pre-compiled .js files)
COPY backend/ ./

# Install production dependencies only
RUN npm ci --production

# Environment
ENV NODE_ENV=production

# Port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
