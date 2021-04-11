import CoveyTownController from './CoveyTownController';
import { CoveyTownList } from '../CoveyTypes';

function passwordMatches(provided: string, expected: string): boolean {
  if (provided === expected) {
    return true;
  }
  if (process.env.MASTER_TOWN_PASSWORD && process.env.MASTER_TOWN_PASWORD === provided) {
    return true;
  }
  return false;
}

export default class CoveyTownsStore {
  private static _instance: CoveyTownsStore;

  private _towns: CoveyTownController[] = [];

  static getInstance(): CoveyTownsStore {
    if (CoveyTownsStore._instance === undefined) {
      CoveyTownsStore._instance = new CoveyTownsStore();
    }
    return CoveyTownsStore._instance;
  }

  getControllerForTown(coveyTownID: string): CoveyTownController | undefined {
    return this._towns.find(town => town.coveyTownID === coveyTownID);
  }

  getMergeableTowns(): CoveyTownList {
    return this._towns.filter(townController => 
      townController.isPubliclyListed && townController.isMergeable)
      .map(townController => ({
        coveyTownID: townController.coveyTownID,
        friendlyName: townController.friendlyName,
        currentOccupancy: townController.occupancy,
        maximumOccupancy: townController.capacity,
      }));
  }

  getTowns(): CoveyTownList {
    return this._towns.filter(townController => townController.isPubliclyListed)
      .map(townController => ({
        coveyTownID: townController.coveyTownID,
        friendlyName: townController.friendlyName,
        currentOccupancy: townController.occupancy,
        maximumOccupancy: townController.capacity,
      }));
  }

  createTown(friendlyName: string, isPubliclyListed: boolean, isMergeable?: boolean): CoveyTownController {
    const newTown = new CoveyTownController(friendlyName, isPubliclyListed, isMergeable);
    this._towns.push(newTown);
    return newTown;
  }

  updateTown(coveyTownID: string, coveyTownPassword: string, friendlyName?: string, makePublic?: boolean): boolean {
    const existingTown = this.getControllerForTown(coveyTownID);
    if (existingTown && passwordMatches(coveyTownPassword, existingTown.townUpdatePassword)) {
      if (friendlyName !== undefined) {
        if (friendlyName.length === 0) {
          return false;
        }
        existingTown.friendlyName = friendlyName;
      }
      if (makePublic !== undefined) {
        existingTown.isPubliclyListed = makePublic;
      }
      return true;
    }
    return false;
  }

  mergeTowns(requestingCoveyTownID: string, destinationCoveyTownID: string, 
    coveyTownPassword: string, newTownFriendlyName: string, 
    newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean): CoveyTownController | undefined {
  
    const existingRequestingTown = this.getControllerForTown(requestingCoveyTownID);
    const existingDestinationTown = this.getControllerForTown(destinationCoveyTownID);
    if (existingRequestingTown && passwordMatches(coveyTownPassword, existingRequestingTown.townUpdatePassword)
      && existingDestinationTown) {
        // TODO: FIX THIS
        // const newTown = new CoveyTownController(newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable);
        // for each player of each room, emit a warning that they're being moved
        // this.createTown(newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable)
        existingRequestingTown.townsMerged(existingDestinationTown.coveyTownID)

        console.log(newTownIsMergeable);
        //TODO: add newTownIsMergeable to update??
        this.updateTown(existingDestinationTown.coveyTownID, existingDestinationTown.townUpdatePassword, 
          newTownFriendlyName, newTownIsPubliclyListed)
        // console.log(newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable)
        // existingDestinationTown.townsMerged(newTown.coveyTownID)

        setTimeout(() => {
          // existingRequestingTown.players.forEach((player) => newTown.addPlayer(player));
          // existingDestinationTown.players.forEach((player) => newTown.addPlayer(player));

          // need to delete town???
          existingRequestingTown.disconnectAllPlayers()
          // existingDestinationTown.disconnectAllPlayers();

          
        }, 10000)
        
        // existingRequestingTown.players.forEach((player) => newTown.addPlayer(player));
        // existingDestinationTown.players.forEach((player) => newTown.addPlayer(player));
        
        // this._towns.push(newTown);


        // need to add all listeners?? or ??? townSubscriptionHandler???
        // existingRequestingTown.disconnectAllPlayers();
        // existingDestinationTown.disconnectAllPlayers();

        return existingDestinationTown;
      }
      return undefined;
  }

  deleteTown(coveyTownID: string, coveyTownPassword: string): boolean {
    const existingTown = this.getControllerForTown(coveyTownID);
    if (existingTown && passwordMatches(coveyTownPassword, existingTown.townUpdatePassword)) {
      this._towns = this._towns.filter(town => town !== existingTown);
      existingTown.disconnectAllPlayers();
      return true;
    }
    return false;
  }

}
