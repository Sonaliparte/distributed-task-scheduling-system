FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY workers.js ./workers.js
ENV WORKER_PORT=6001
EXPOSE 6001
CMD ["node", "workers.js"]