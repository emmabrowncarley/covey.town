import assert from 'assert';
import { Socket } from 'socket.io';
import Player from '../types/Player';
import { CoveyTownList, UserLocation } from '../CoveyTypes';
import CoveyTownListener from '../types/CoveyTownListener';
import CoveyTownsStore from '../lib/CoveyTownsStore';
// import useLocalVideoToggle from '../../hooks/useLocalVideoToggle/useLocalVideoToggle';


/**
 * The format of a request to join a Town in Covey.Town, as dispatched by the server middleware
 */
export interface TownJoinRequest {
  /** userName of the player that would like to join * */
  userName: string;
  /** ID of the town that the player would like to join * */
  coveyTownID: string;
}

/**
 * The format of a response to join a Town in Covey.Town, as returned by the handler to the server
 * middleware
 */
export interface TownJoinResponse {
  /** Unique ID that represents this player * */
  coveyUserID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  coveySessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Is this town able to be merged? * */
  isMergeable: boolean;
}

/**
 * Payload sent by client to create a Town in Covey.Town
 */
export interface TownCreateRequest {
  friendlyName: string;
  isPubliclyListed: boolean;
  isMergeable: boolean;
}

/**
 * Response from the server for a Town create request
 */
export interface TownCreateResponse {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Response from the server for a Town list request
 */
export interface TownListResponse {
  towns: CoveyTownList;
}

/**
 * Payload sent by the client to delete a Town
 */
export interface TownDeleteRequest {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Payload sent by the client to update a Town.
 * N.B., JavaScript is terrible, so:
 * if(!isPubliclyListed) -> evaluates to true if the value is false OR undefined, use ===
 */
export interface TownUpdateRequest {
  coveyTownID: string;
  coveyTownPassword: string;
  friendlyName?: string;
  isPubliclyListed?: boolean;
  isMergeable?: boolean;
  isJoinable?: boolean;
}

/**
 * Payload sent by the client to merge two towns
 */
export interface TownMergeRequest {
  destinationCoveyTownID: string;
  requestedCoveyTownID: string;
  coveyTownPassword: string;
  newTownFriendlyName: string;
  newTownIsPubliclyListed: boolean;
  newTownIsMergeable: boolean;
}

/**
 * Response from the server for a Town merge request
 */
export interface TownMergeResponse {
  coveyTownID: string;
  friendlyName: string;
  isPubliclyListed: boolean;
  isMergeable: boolean;
}

/**
 * Envelope that wraps any response from the server
 */
export interface ResponseEnvelope<T> {
  isOK: boolean;
  message?: string;
  response?: T;
}

/**
 * A handler to process a player's request to join a town. The flow is:
 *  1. Client makes a TownJoinRequest, this handler is executed
 *  2. Client uses the sessionToken returned by this handler to make a subscription to the town,
 *  @see townSubscriptionHandler for the code that handles that request.
 *
 * @param requestData an object representing the player's request
 */
export async function townJoinHandler(requestData: TownJoinRequest): Promise<ResponseEnvelope<TownJoinResponse>> {
  const townsStore = CoveyTownsStore.getInstance();

  const coveyTownController = townsStore.getControllerForTown(requestData.coveyTownID);
  if (!coveyTownController) {
    return {
      isOK: false,
      message: 'Error: No such town',
    };
  }
  const joinable = coveyTownController.isJoinable;
  if (!joinable){
    return {
      isOK: false,
      message: 'Town is merging and cannot be joined at this time',
    };
  }
  const newPlayer = new Player(requestData.userName);
  const newSession = await coveyTownController.addPlayer(newPlayer);
  assert(newSession.videoToken);
  return {
    isOK: true,
    response: {
      coveyUserID: newPlayer.id,
      coveySessionToken: newSession.sessionToken,
      providerVideoToken: newSession.videoToken,
      currentPlayers: coveyTownController.players,
      friendlyName: coveyTownController.friendlyName,
      isPubliclyListed: coveyTownController.isPubliclyListed,
      isMergeable: coveyTownController.isMergeable,
    },
  };
}

export async function townListHandler(): Promise<ResponseEnvelope<TownListResponse>> {
  const townsStore = CoveyTownsStore.getInstance();
  return {
    isOK: true,
    response: { towns: townsStore.getTowns() },
  };
}

export async function townMergeableListHandler(): Promise<ResponseEnvelope<TownListResponse>> {
  const townsStore = CoveyTownsStore.getInstance();
  return {
    isOK: true,
    response: { towns: townsStore.getMergeableTowns() },
  };
}

export async function townCreateHandler(requestData: TownCreateRequest): Promise<ResponseEnvelope<TownCreateResponse>> {
  const townsStore = CoveyTownsStore.getInstance();
  if (requestData.friendlyName.length === 0) {
    return {
      isOK: false,
      message: 'FriendlyName must be specified',
    };
  }
  const newTown = townsStore.createTown(requestData.friendlyName, requestData.isPubliclyListed, requestData.isMergeable);
  return {
    isOK: true,
    response: {
      coveyTownID: newTown.coveyTownID,
      coveyTownPassword: newTown.townUpdatePassword,
    },
  };
}

export async function townMergeRequestHandler(requestData: TownMergeRequest): Promise<ResponseEnvelope<TownMergeResponse>> {
  const townsStore = CoveyTownsStore.getInstance();
  if (requestData.requestedCoveyTownID === '') {
    return {
      isOK: false,
      message: 'Please specify a town to merge with',
    };
  }
  const destinationCoveyTownController = townsStore.getControllerForTown(requestData.destinationCoveyTownID);
  if (!destinationCoveyTownController) {
    return {
      isOK: false,
      message: 'No such town',
    };
  }
  const requestedCoveyTownController = townsStore.getControllerForTown(requestData.requestedCoveyTownID);
  if (!requestedCoveyTownController) {
    return {
      isOK: false,
      message: 'No such town',
    };
  }
  if (!requestedCoveyTownController.isMergeable) {
    return {
      isOK: false,
      message: 'Specified town cannot be merged with. Please select a different town',
    };
  }
  if (!requestedCoveyTownController.isJoinable) {
    return {
      isOK: false,
      message: 'Specified town is currently undergoing a merge and cannot be merged with. Please select a different town',
    };
  }
  if (destinationCoveyTownController.occupancy + requestedCoveyTownController.occupancy > destinationCoveyTownController.capacity ){
    return {
      isOK: false,
      message: `The combined occupancy of these two towns is greater than ${destinationCoveyTownController.capacity} and cannot be merged at this time`,
    };
  }
  if (requestData.newTownFriendlyName === ''){
    return {
      isOK: false,
      message: 'Must specify a name for the new town',
    };
  }
  if (requestData.coveyTownPassword !== townsStore.getControllerForTown(requestData.destinationCoveyTownID)?.townUpdatePassword) {
    return {
      isOK: false,
      message: 'Invalid password. Please double check your town update password.',
    };
  }
  
  const mergedTown = townsStore.mergeTowns(requestData.destinationCoveyTownID, 
    requestData.requestedCoveyTownID, requestData.coveyTownPassword, 
    requestData.newTownFriendlyName, requestData.newTownIsPubliclyListed, 
    requestData.newTownIsMergeable);

  const pause = (ms: number) => new Promise(res => setTimeout(res, ms));
  await pause(7000);
    
  if (mergedTown) {
    return {
      isOK: true,
      response: {
        coveyTownID: mergedTown.coveyTownID,
        friendlyName: mergedTown.friendlyName,
        isPubliclyListed: mergedTown.isPubliclyListed,
        isMergeable: mergedTown.isMergeable,
      },
    };
  }
  return {
    isOK: false,
    message: 'Merge failed.',
  };
}

export async function townDeleteHandler(requestData: TownDeleteRequest): Promise<ResponseEnvelope<Record<string, null>>> {
  const townsStore = CoveyTownsStore.getInstance();
  const success = townsStore.deleteTown(requestData.coveyTownID, requestData.coveyTownPassword);
  return {
    isOK: success,
    response: {},
    message: !success ? 'Invalid password. Please double check your town update password.' : undefined,
  };
}

export async function townUpdateHandler(requestData: TownUpdateRequest): Promise<ResponseEnvelope<Record<string, null>>> {
  const townsStore = CoveyTownsStore.getInstance();
  const success = townsStore.updateTown(requestData.coveyTownID, requestData.coveyTownPassword, requestData.friendlyName, requestData.isPubliclyListed,
    requestData.isMergeable, requestData.isJoinable);
  return {
    isOK: success,
    response: {},
    message: !success ? 'Invalid password or update values specified. Please double check your town update password.' : undefined,
  };

}

/**
 * An adapter between CoveyTownController's event interface (CoveyTownListener)
 * and the low-level network communication protocol
 *
 * @param socket the Socket object that we will use to communicate with the player
 */
function townSocketAdapter(socket: Socket): CoveyTownListener {
  return {
    onPlayerMoved(movedPlayer: Player) {
      socket.emit('playerMoved', movedPlayer);
    },
    onPlayerDisconnected(removedPlayer: Player) {
      socket.emit('playerDisconnect', removedPlayer);
    },
    onPlayerJoined(newPlayer: Player) {
      socket.emit('newPlayer', newPlayer);
    },
    onTownDestroyed() {
      socket.emit('townClosing');
      socket.disconnect(true);
    },
    onTownMerged(destinationTownID: string, requestedTownID: string, destinationFriendlyName: string, requestedFriendlyName: string, 
      newTownFriendlyName: string, newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean) {
      // const { isEnabled: isVideoEnabled, toggleVideoEnabled } = useLocalVideoToggle();

      socket.emit('roomsMerged', destinationTownID, requestedTownID, destinationFriendlyName, 
        requestedFriendlyName, newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable);
    },
  };
}

/**
 * A handler to process a remote player's subscription to updates for a town
 *
 * @param socket the Socket object that we will use to communicate with the player
 */
export function townSubscriptionHandler(socket: Socket): void {
  // Parse the client's session token from the connection
  // For each player, the session token should be the same string returned by joinTownHandler
  const { token, coveyTownID } = socket.handshake.auth as { token: string; coveyTownID: string };

  const townController = CoveyTownsStore.getInstance()
    .getControllerForTown(coveyTownID);

  // Retrieve our metadata about this player from the TownController
  const s = townController?.getSessionByToken(token);
  if (!s || !townController) {
    // No valid session exists for this token, hence this client's connection should be terminated
    socket.disconnect(true);
    return;
  }

  // Create an adapter that will translate events from the CoveyTownController into
  // events that the socket protocol knows about
  const listener = townSocketAdapter(socket);
  townController.addTownListener(listener);

  // Register an event listener for the client socket: if the client disconnects,
  // clean up our listener adapter, and then let the CoveyTownController know that the
  // player's session is disconnected
  socket.on('disconnect', () => {
    townController.removeTownListener(listener);
    townController.destroySession(s);
  });

  // Register an event listener for the client socket: if the client updates their
  // location, inform the CoveyTownController
  socket.on('playerMovement', (movementData: UserLocation) => {
    townController.updatePlayerLocation(s.player, movementData);
  });
}
