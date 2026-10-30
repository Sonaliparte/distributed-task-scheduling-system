FROM node:20-bookworm AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends cmake g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scheduler ./scheduler
RUN cmake -S scheduler -B scheduler/build -DCMAKE_BUILD_TYPE=Release \
  && cmake --build scheduler/build --config Release

FROM node:20-bookworm-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
COPY --from=build /app/scheduler/build ./scheduler/build
COPY --from=build /app/scheduler/include ./scheduler/include

ENV NODE_ENV=production
ENV PORT=5000
ENV SCHEDULER_BINARY=/app/scheduler/build/scheduler
EXPOSE 5000
CMD ["node", "backend/server.js"]