## build runner
FROM node:lts-alpine as build-runner

# Set temp directory
WORKDIR /tmp/app

# Move package.json
COPY package.json .

# Install dependencies
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 && \
    npm install --legacy-peer-deps && \
    apk del .build-deps
RUN npm install --legacy-peer-deps

# Move source files
COPY src ./src
COPY config.json   .
COPY tsconfig.json   .

# Build project
RUN npm run build

## production runner
FROM node:lts-alpine as prod-runner

# Set work directory
WORKDIR /app

# Copy package.json from build-runner
COPY --from=build-runner /tmp/app/package.json /app/package.json

# Install dependencies
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 && \
    npm install --legacy-peer-deps && \
    apk del .build-deps
RUN npm install --omit=dev --legacy-peer-deps

# Move build files
COPY --from=build-runner /tmp/app/build /app/build
COPY src/data/docs/* /app/build/src/data/docs/
# Start bot
CMD [ "npm",  "start" ]
