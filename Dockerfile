FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy backend source files
COPY backend/ ./

# Compile TypeScript to JavaScript
RUN npx tsc --version && find . -name '*.ts' -not -path './node_modules/*' | xargs -I {} sh -c 'echo "Compiling {}" && npx tsc {} --outDir . --module commonjs --target ES2020 --skipLibCheck --resolveJsonModule' || true

# Remove devDependencies for production
RUN npm ci --production

# Environment
ENV NODE_ENV=production

# Port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
