# Covey.Town

Covey.Town provides a virtual meeting space where different groups of people can have simultaneous video calls, allowing participants to drift between different conversations, just like in real life.
Covey.Town was built for Northeastern's [Spring 2021 software engineering course](https://neu-se.github.io/CS4530-CS5500-Spring-2021/), and is designed to be reused across semesters.
You can view our reference deployment of the app at [app.covey.town](https://app.covey.town/).

![Covey.Town Architecture](docs/covey-town-architecture.png)

The figure above depicts the high-level architecture of Covey.Town.
The frontend client (in the `frontend` directory of this repository) uses the [PhaserJS Game Library](https://phaser.io) to create a 2D game interface, using tilemaps and sprites.
The frontend implements video chat using the [Twilio Programmable Video](https://www.twilio.com/docs/video) API, and that aspect of the interface relies heavily on [Twilio's React Starter App](https://github.com/twilio/twilio-video-app-react).

A backend service (in the `services/roomService` directory) implements the application logic: tracking which "towns" are available to be joined, and the state of each of those towns.

# Covey.Town - Merge

Covey.Town provides a virtual meeting space where different groups of people can have simultaneous video calls,
allowing participants to drift between different conversations, just like in real life. Our group has implemented a version of
Covey.Town where there is capabiltiy to merge rooms together. To test out this function read the steps below.

## Running this app locally

Running the application locally entails running both the backend service and a frontend.

### Setting up the backend

To run the backend, you will need a Twilio account. Twilio provides new accounts with $15 of credit, which is more than enough to get started.
To create an account and configure your local environment:

1. Go to [Twilio](https://www.twilio.com/) and create an account. You do not need to provide a credit card to create a trial account.
2. Create an API key and secret (select "API Keys" on the left under "Settings")
3. Create a `.env` file in the `services/roomService` directory, setting the values as follows:

| Config Value            | Description                               |
| ----------------------- | ----------------------------------------- |
| `TWILIO_ACCOUNT_SID`    | Visible on your twilio account dashboard. |
| `TWILIO_API_KEY_SID`    | The SID of the new API key you created.   |
| `TWILIO_API_KEY_SECRET` | The secret for the API key you created.   |
| `TWILIO_API_AUTH_TOKEN` | Visible on your twilio account dashboard. |

### Starting the backend

Once your backend is configured, you can start it by running `npm start` in the `services/roomService` directory (the first time you run it, you will also need to run `npm install`).
The backend will automatically restart if you change any of the files in the `services/roomService/src` directory.

### Configuring the frontend

Create a `.env` file in the `frontend` directory, with the line: `REACT_APP_TOWNS_SERVICE_URL=http://localhost:8081` (if you deploy the rooms/towns service to another location, put that location here instead)

### Running the frontend

In the `frontend` directory, run `npm start` (again, you'll need to run `npm install` the very first time). After several moments (or minutes, depending on the speed of your machine), a browser will open with the frontend running locally.
The frontend will automatically re-compile and reload in your browser if you change any files in the `frontend/src` directory.

### Instructions on Merging

1. At the homepage of Covey.Town you will need to create at least two different rooms. When creating the towns it is important to make sure that the **"mergeable?"** checkbox is clicked.
2. NOTE: you can select to make these town private, but if the town is private the townID should be saved so that you can find the town when creating a merge request
3. Create a merge request with the **"Merge with Other Towns"** button and enter all of the necessary information and configure the settings according to user discretion.
4. The merge request will then be received and all users from both towns will be placed into the new merged town with the requesting town ID and town update password transfer to be the properties of the new merged town.
5. The towns have been merged successfully.

[Github link](https://github.com/emmabrowncarley/covey.town.git)

### Instructions on Deploying Covey.Town

If you wish to deploy our code, you can follow these [deployment instructions.](https://neu-se.github.io/CS4530-CS5500-Spring-2021/Activities/continuous-development)

To view our currently deployed site, you can follow this [link.](https://suspicious-yalow-c7b051.netlify.app/)
