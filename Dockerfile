# ---- Base image ----
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only dependency manifests first so Docker can cache this layer
# (re-runs only when package.json or lockfile changes, not on every code change)
COPY package*.json ./

# Install production dependencies only — faster builds, smaller image
RUN npm ci --only=production

# Copy the rest of the source code
COPY . .

# Expose the port the monolith listens on (overridden by $PORT in Railway)
EXPOSE 5000

# Start the server using the npm start script defined in package.json
CMD ["npm", "start"]
