# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# and install dependencies. This step is separated to leverage Docker's cache.
COPY package*.json ./
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that Expo web usually runs on (19006)
EXPOSE 19006

# Command to run the application
CMD ["npm", "run", "web"]
