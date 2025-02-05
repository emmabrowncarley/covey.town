import React, {
  Dispatch, SetStateAction, useCallback, useEffect, useMemo, useReducer, useState,
} from 'react';
import './App.css';
import { BrowserRouter } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ChakraProvider, CloseAllToastsOptions, ToastId, useToast, UseToastOptions } from '@chakra-ui/react';
import { MuiThemeProvider } from '@material-ui/core/styles';
import assert from 'assert';
import WorldMap from './components/world/WorldMap';
import VideoOverlay from './components/VideoCall/VideoOverlay/VideoOverlay';
import VideoContext from './contexts/VideoContext';
import Login from './components/Login/Login';
import CoveyAppContext from './contexts/CoveyAppContext';
import NearbyPlayersContext from './contexts/NearbyPlayersContext';
import AppStateProvider, { useAppState } from './components/VideoCall/VideoFrontend/state';
import useConnectionOptions from './components/VideoCall/VideoFrontend/utils/useConnectionOptions/useConnectionOptions';
import UnsupportedBrowserWarning
  from './components/VideoCall/VideoFrontend/components/UnsupportedBrowserWarning/UnsupportedBrowserWarning';
import { VideoProvider } from './components/VideoCall/VideoFrontend/components/VideoProvider';
import ErrorDialog from './components/VideoCall/VideoFrontend/components/ErrorDialog/ErrorDialog';
import theme from './components/VideoCall/VideoFrontend/theme';
import { Callback } from './components/VideoCall/VideoFrontend/types';
import Player, { ServerPlayer, UserLocation } from './classes/Player';
import { TownJoinResponse } from './classes/TownsServiceClient';
import Video from './classes/Video/Video';
import { CoveyAppUpdate, appStateReducer, defaultAppState } from './AppHelper'
import useVideoContext from "./components/VideoCall/VideoFrontend/hooks/useVideoContext/useVideoContext";

type IToast = {
  (options?: UseToastOptions | undefined): string | number | undefined;
  close: (id: ToastId) => void;
  closeAll: (options?: CloseAllToastsOptions | undefined) => void;
  update(id: ToastId, options: Pick<UseToastOptions, "position" | "onCloseComplete" | "duration" | "title" | "status" | "render" | "description" | "isClosable" | "variant">): void;
  isActive: (id: ToastId) => boolean | undefined;
}

async function GameController(initData: TownJoinResponse,
  dispatchAppUpdate: (update: CoveyAppUpdate) => void, toast?: IToast) {
  // Now, set up the game sockets
  const gamePlayerID = initData.coveyUserID;
  const sessionToken = initData.coveySessionToken;
  const url = process.env.REACT_APP_TOWNS_SERVICE_URL;
  assert(url);
  const video = Video.instance();
  assert(video);
  const roomName = video.townFriendlyName;
  assert(roomName);

  const socket = io(url, { auth: { token: sessionToken, coveyTownID: video.coveyTownID } });
  socket.on('newPlayer', (player: ServerPlayer) => {
    dispatchAppUpdate({
      action: 'addPlayer',
      player: Player.fromServerPlayer(player),
    });
  });
  socket.on('playerMoved', (player: ServerPlayer) => {
    if (player._id !== gamePlayerID) {
      dispatchAppUpdate({ action: 'playerMoved', player: Player.fromServerPlayer(player) });
    }
  });
  socket.on('playerDisconnect', (player: ServerPlayer) => {
    dispatchAppUpdate({ action: 'playerDisconnect', player: Player.fromServerPlayer(player) });
  });
  socket.on('disconnect', () => {
    dispatchAppUpdate({ action: 'disconnect' });
  });
  socket.on('roomsMerging', (destinationTownID: string, requestedTownID: string, destinationFriendlyName: string, 
    requestedFriendlyName: string , newTownFriendlyName: string, newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean) => {
    if (toast) {
      toast({
        title: 'Town is merging with another town',
        description: `Town ${destinationFriendlyName} (${destinationTownID}) is merging with town ${requestedFriendlyName}
        (${requestedTownID}) momentarily! The new town will be called "${newTownFriendlyName}",
        ${newTownIsPubliclyListed ? '✓' : '✗'} Publicly Listed,
        and ${newTownIsMergeable ? '✓' : '✗'} Mergeable`,
        status: 'success',
        isClosable: true,
        duration: 7000,
      })
    }
  });

  const emitMovement = (location: UserLocation) => {
    socket.emit('playerMovement', location);
    dispatchAppUpdate({ action: 'weMoved', location });
  };

  dispatchAppUpdate({
    action: 'doConnect',
    data: {
      sessionToken,
      userName: video.userName,
      townFriendlyName: roomName,
      townID: video.coveyTownID,
      myPlayerID: gamePlayerID,
      townIsPubliclyListed: video.isPubliclyListed,
      townIsMergeable: video.isMergeable,
      townIDToMerge: '',
      emitMovement,
      socket,
      players: initData.currentPlayers.map((sp) => Player.fromServerPlayer(sp)),
    },
  });
  return true;
}

function App(props: { setOnDisconnect: Dispatch<SetStateAction<Callback | undefined>> }) {
  const [appState, dispatchAppUpdate] = useReducer(appStateReducer, defaultAppState());
  const toast = useToast();
  const {room} = useVideoContext();

  const setupGameController = useCallback(async (initData: TownJoinResponse) => {
    await GameController(initData, dispatchAppUpdate, toast);
    return true;
  }, [dispatchAppUpdate, toast]);
  const videoInstance = Video.instance();

  const { setOnDisconnect } = props;

  useEffect(()=>{
    if(!appState.socket){
      return;
    }
    appState.socket.off('roomsMerged');
    appState.socket.on('roomsMerged', async (destinationTownID: string, requestedTownID: string, destinationFriendlyName: string,
                              requestedFriendlyName: string , newTownFriendlyName: string, newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean) => {
      await room.disconnect();
      dispatchAppUpdate({ action: 'updateTownToMerge', newTownIDToMerge: destinationTownID});
      if (toast) {
        toast({
          title: 'Town merge was successful!',
          description: `The new town is called "${newTownFriendlyName}" (${destinationTownID}),
        ${newTownIsPubliclyListed ? '✓' : '✗'} Publicly Listed,
        and ${newTownIsMergeable ? '✓' : '✗'} Mergeable`,
          status: 'success',
          isClosable: true,
          duration: 10000,
        })
      }
    })

  }, [appState.socket, appState.currentTownID, room, toast]);
  useEffect(() => {
    setOnDisconnect(() => async () => { // Here's a great gotcha: https://medium.com/swlh/how-to-store-a-function-with-the-usestate-hook-in-react-8a88dd4eede1
      dispatchAppUpdate({ action: 'disconnect' });
      return Video.teardown();
    });
  }, [dispatchAppUpdate, setOnDisconnect]);

  const page = useMemo(() => {
    if (!appState.sessionToken) {
      return <Login doLogin={setupGameController} />;
    } if (!videoInstance) {
      return <div>Loading...</div>;
    }
    return (
      <div>
        <WorldMap />
        <VideoOverlay preferredMode="fullwidth" />
      </div>
    );
  }, [setupGameController, appState.sessionToken, videoInstance]);
  return (

    <CoveyAppContext.Provider value={appState}>
      <VideoContext.Provider value={Video.instance()}>
        <NearbyPlayersContext.Provider value={appState.nearbyPlayers}>
          {page}
        </NearbyPlayersContext.Provider>
      </VideoContext.Provider>
    </CoveyAppContext.Provider>

  );
}

function EmbeddedTwilioAppWrapper() {
  const { error, setError } = useAppState();
  const [onDisconnect, setOnDisconnect] = useState<Callback | undefined>();
  const connectionOptions = useConnectionOptions();
  return (
    <UnsupportedBrowserWarning>
      <VideoProvider options={connectionOptions} onError={setError} onDisconnect={onDisconnect}>
        <ErrorDialog dismissError={() => setError(null)} error={error} />
        <App setOnDisconnect={setOnDisconnect} />
      </VideoProvider>
    </UnsupportedBrowserWarning>
  );
}

export default function AppStateWrapper(): JSX.Element {
  return (
    <BrowserRouter>
      <ChakraProvider>
        <MuiThemeProvider theme={theme('rgb(185, 37, 0)')}>
          <AppStateProvider preferredMode="fullwidth" highlightedProfiles={[]}>
            <EmbeddedTwilioAppWrapper />
          </AppStateProvider>
        </MuiThemeProvider>
      </ChakraProvider>
    </BrowserRouter>
  );
}
