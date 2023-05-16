# ! ~~~ Builder ~~~ !
FROM node:18.16.0-slim AS builder

WORKDIR /tmp/app

RUN npm install pnpm -g

COPY package.json .
COPY pnpm-lock.yaml .
COPY src src

RUN pnpm install

COPY tsconfig.json .
COPY config.json .

RUN pnpm run build

# ! ~~~ Runner ~~~ !
FROM node:18.16.0-slim AS runner

WORKDIR /app

RUN npm install pnpm -g

COPY --from=builder /tmp/app/build /app/build
COPY --from=builder /tmp/app/package.json /app/package.json
COPY --from=builder /tmp/app/pnpm-lock.yaml /app/pnpm-lock.yaml

RUN pnpm install --prod --ignore-scripts

CMD ["pnpm", "run", "start"]
