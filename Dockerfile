FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all files
COPY . .

# Make the index.js file executable
RUN chmod +x index.js

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "index.js"] 