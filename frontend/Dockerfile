# Stage 1: Build the React application using Node.js
FROM node:18-alpine AS build

WORKDIR /app

# Copy all source files first
COPY . .

# Install dependencies explicitly
RUN npm install react react-dom recharts && \
    npm install -D vite @vitejs/plugin-react
RUN npm run build

# Stage 2: Serve the built application using NGINX
FROM nginx:alpine

# Copy the built assets from the previous stage to NGINX
COPY --from=build /app/dist /usr/share/nginx/html

# Custom Nginx configuration for proxying API calls
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
