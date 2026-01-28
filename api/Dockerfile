# Camera Dashboard API
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm install --production
COPY src /app/src
COPY migrations /app/migrations
EXPOSE 8080
CMD ["node", "src/index.js"]
