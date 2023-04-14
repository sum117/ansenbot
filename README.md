<p align="center">
  <image src="https://user-images.githubusercontent.com/78707622/230064964-6fdbb86d-6be9-4df9-8319-dd8794ffb71e.png">
</p>

# AnsenBot - TypeScript Roleplaying System with DiscordX, PocketBase, and OpenAI API

This project is a roleplaying system for Discord that integrates DiscordX, PocketBase, and the OpenAI API to provide an immersive and interactive experience for users. With features such as leveling, AI-generated quests, and a range of roleplaying utilities, this system offers a unique and engaging way for users to participate in roleplaying games within a Discord server.

## Table of Contents

- [AnsenBot - TypeScript Roleplaying System with DiscordX, PocketBase, and OpenAI API](#ansenbot---typescript-roleplaying-system-with-discordx-pocketbase-and-openai-api)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Bot Settings](#bot-settings)
    - [Docker Settings for PocketBase](#docker-settings-for-pocketbase)
  - [Usage](#usage)
  - [License](#license)

## Features

- Character leveling system with skills and attributes
- AI-generated quests using OpenAI's GPT-3
- Inventory management and item trading
- Party system for collaborative gameplay
- Combat mechanics and boss encounters
- Persistent character data storage using PocketBase
- In-game economy with shops and trading
- Interactive NPCs for questing, dialogue, and world-building
- Customizable experience for server administrators

## Prerequisites

- Node.js v14.x or higher
- NPM v6.x or higher
- PocketBase account and database
- OpenAI API key
- Docker (optional) Note: If you are not using docker to run pocketbase, you will need to access their [documentation](https://pocketbase.io/docs) to learn how to set it up for your OS

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ansenbot.git
```

2. Change the working directory:

```bash
cd ansenbot
```

3. Install the dependencies:

```bash
npm install
```

4. Copy the example `.env` file:

```bash
cp .env.example .env
```

5. Update the `.env` file with your Discord bot token, PocketBase database credentials, and OpenAI API key.

6. Start the bot:

```bash
npm run dev
```

## Configuration

### Bot Settings

The bot's settings can be customized by editing the `config.json` file. Here you can change various settings, such as the command prefix, experience rate, and more.

### Docker Settings for PocketBase

Credits to [muchobien](https://github.com/muchobien/pocketbase-docker) for the docker image and docker-compose.yml file.

docker-compose.yml

```yml
version: "3.7"
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    container_name: pocketbase
    restart: unless-stopped
    command:
      - --encryptionEnv #optional
      - ENCRYPTION #optional
    environment:
      ENCRYPTION: example #optional
    ports:
      - "8090:8090"
    volumes:
      - /path/to/data:/pb_data #map to a local folder
      - /path/to/public:/pb_public #optional
      -/path/to/migrations:/pb_migrations #optional
    healthcheck: #optional (recommended) since v0.10.0
      test: wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1
      interval: 5s
      timeout: 5s
      retries: 5
```

## Usage

Invite the bot to your Discord server and grant it the necessary permissions. Once the bot is up and running, it will respond to commands and interact with users based on the roleplaying system features.

For a list of available commands, type `/help` in a text channel the bot can read and respond to.

## License

This project is licensed under the [MIT License](LICENSE).
