FROM node:18-alpine AS builder

WORKDIR /app

# install deps and build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# install only production deps
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund

# copy built output
COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["node", "build/index.js"]