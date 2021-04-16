import { nanoid } from 'nanoid';
import CoveyTownsStore from './CoveyTownsStore';
import CoveyTownListener from '../types/CoveyTownListener';
import Player from '../types/Player';

const mockCoveyListenerTownDestroyed = jest.fn();
const mockCoveyListenerOtherFns = jest.fn();

function mockCoveyListener(): CoveyTownListener {
  return {
    onPlayerDisconnected(removedPlayer: Player): void {
      mockCoveyListenerOtherFns(removedPlayer);
    },
    onPlayerMoved(movedPlayer: Player): void {
      mockCoveyListenerOtherFns(movedPlayer);
    },
    onTownDestroyed() {
      mockCoveyListenerTownDestroyed();
    },
    onPlayerJoined(newPlayer: Player) {
      mockCoveyListenerOtherFns(newPlayer);
    },
    onTownMerged(destinationTownID: string, requestedTownID: string, destinationFriendlyName: string, requestedFriendlyName: string, 
      newTownFriendlyName: string, newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean){
      mockCoveyListenerOtherFns(destinationTownID, requestedTownID, destinationFriendlyName, requestedFriendlyName,
        newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable);
    },
    onTownMerging(destinationTownID: string, requestedTownID: string, destinationFriendlyName: string, requestedFriendlyName: string, 
      newTownFriendlyName: string, newTownIsPubliclyListed: boolean, newTownIsMergeable: boolean){
      mockCoveyListenerOtherFns(destinationTownID, requestedTownID, destinationFriendlyName, requestedFriendlyName,
        newTownFriendlyName, newTownIsPubliclyListed, newTownIsMergeable);
    },
  };
}

function createTownForTesting(friendlyNameToUse?: string, isPublic = false, isMergeable = true) {
  const friendlyName = friendlyNameToUse !== undefined ? friendlyNameToUse :
    `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
  return CoveyTownsStore.getInstance()
    .createTown(friendlyName, isPublic, isMergeable);
}

describe('CoveyTownsStore', () => {
  beforeEach(() => {
    mockCoveyListenerTownDestroyed.mockClear();
    mockCoveyListenerOtherFns.mockClear();
  });
  it('should be a singleton', () => {
    const store1 = CoveyTownsStore.getInstance();
    const store2 = CoveyTownsStore.getInstance();
    expect(store1)
      .toBe(store2);
  });

  describe('createTown', () => {
    it('Should allow multiple towns with the same friendlyName', () => {
      const firstTown = createTownForTesting();
      const secondTown = createTownForTesting(firstTown.friendlyName);
      expect(firstTown)
        .not
        .toBe(secondTown);
      expect(firstTown.friendlyName)
        .toBe(secondTown.friendlyName);
      expect(firstTown.coveyTownID)
        .not
        .toBe(secondTown.coveyTownID);
    });
  });

  describe('getControllerForTown', () => {
    it('Should return the same controller on repeated calls', async () => {
      const firstTown = createTownForTesting();
      expect(firstTown)
        .toBe(CoveyTownsStore.getInstance()
          .getControllerForTown(firstTown.coveyTownID));
      expect(firstTown)
        .toBe(CoveyTownsStore.getInstance()
          .getControllerForTown(firstTown.coveyTownID));
    });
  });

  describe('updateTown', () => {
    it('Should check the password before updating any value', () => {
      const town = createTownForTesting();
      const { friendlyName } = town;
      const res = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, 'abcd', 'newName', true, false, false);
      expect(res)
        .toBe(false);
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town.isPubliclyListed)
        .toBe(false);
      expect(town.isMergeable)
        .toBe(true);
      expect(town.isJoinable)
        .toBe(true);

    });
    it('Should fail if the townID does not exist', async () => {
      const town = createTownForTesting();
      const { friendlyName } = town;

      const res = CoveyTownsStore.getInstance()
        .updateTown('abcdef', town.townUpdatePassword, 'newName', true);
      expect(res)
        .toBe(false);
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town.isPubliclyListed)
        .toBe(false);

    });
    it('Should update the town parameters', async () => {

      // First try with just a visiblity change
      const town = createTownForTesting();
      const { friendlyName } = town;
      const res = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, undefined, true);
      expect(res)
        .toBe(true);
      expect(town.isPubliclyListed)
        .toBe(true);
      expect(town.friendlyName)
        .toBe(friendlyName);

      // Now try with just a name change
      const newFriendlyName = nanoid();
      const res2 = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, newFriendlyName, undefined);
      expect(res2)
        .toBe(true);
      expect(town.isPubliclyListed)
        .toBe(true);
      expect(town.friendlyName)
        .toBe(newFriendlyName);

      // Now try with a mergeable change
      const resMerge = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, undefined, undefined, false);
      expect(resMerge)
        .toBe(true);
      expect(town.isMergeable)
        .toBe(false);

      // Now try with a joinable change
      const resJoin = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, undefined, undefined, undefined, false);
      expect(resJoin)
        .toBe(true);
      expect(town.isJoinable)
        .toBe(false);

      // Now try to change both friendlyName and public
      const res3 = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, friendlyName, false);
      expect(res3)
        .toBe(true);
      expect(town.isPubliclyListed)
        .toBe(false);
      expect(town.friendlyName)
        .toBe(friendlyName);

      // Now try to change everything
      const everything = CoveyTownsStore.getInstance()
        .updateTown(town.coveyTownID, town.townUpdatePassword, friendlyName, false, false, false);
      expect(everything)
        .toBe(true);
      expect(town.isPubliclyListed)
        .toBe(false);
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town.isMergeable)
        .toBe(false);
      expect(town.isJoinable)
        .toBe(false);
    });
  });

  describe('deleteTown', () => {
    it('Should check the password before deleting the town', () => {
      const town = createTownForTesting();
      const res = CoveyTownsStore.getInstance()
        .deleteTown(town.coveyTownID, `${town.townUpdatePassword}*`);
      expect(res)
        .toBe(false);
    });
    it('Should fail if the townID does not exist', async () => {
      const res = CoveyTownsStore.getInstance()
        .deleteTown('abcdef', 'efg');
      expect(res)
        .toBe(false);
    });
    it('Should disconnect all players', async () => {
      const town = createTownForTesting();
      town.addTownListener(mockCoveyListener());
      town.addTownListener(mockCoveyListener());
      town.addTownListener(mockCoveyListener());
      town.addTownListener(mockCoveyListener());
      town.disconnectAllPlayers();

      expect(mockCoveyListenerOtherFns.mock.calls.length)
        .toBe(0);
      expect(mockCoveyListenerTownDestroyed.mock.calls.length)
        .toBe(4);
    });
  });

  describe('listTowns', () => {
    it('Should include public towns', async () => {
      const town = createTownForTesting(undefined, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns();
      const entry = towns.filter(townInfo => townInfo.coveyTownID === town.coveyTownID);
      expect(entry.length)
        .toBe(1);
      expect(entry[0].friendlyName)
        .toBe(town.friendlyName);
      expect(entry[0].coveyTownID)
        .toBe(town.coveyTownID);
    });
    it('Should include each CoveyTownID if there are multiple towns with the same friendlyName', async () => {
      const town = createTownForTesting(undefined, true);
      const secondTown = createTownForTesting(town.friendlyName, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName);
      expect(towns.length)
        .toBe(2);
      expect(towns[0].friendlyName)
        .toBe(town.friendlyName);
      expect(towns[1].friendlyName)
        .toBe(town.friendlyName);

      if (towns[0].coveyTownID === town.coveyTownID) {
        expect(towns[1].coveyTownID)
          .toBe(secondTown.coveyTownID);
      } else if (towns[1].coveyTownID === town.coveyTownID) {
        expect(towns[0].coveyTownID)
          .toBe(town.coveyTownID);
      } else {
        fail('Expected the coveyTownIDs to match the towns that were created');
      }

    });
    it('Should not include private towns', async () => {
      const town = createTownForTesting(undefined, false);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(towns.length)
        .toBe(0);
    });
    it('Should not include private towns, even if there is a public town of same name', async () => {
      const town = createTownForTesting(undefined, false);
      const town2 = createTownForTesting(town.friendlyName, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(towns.length)
        .toBe(1);
      expect(towns[0].coveyTownID)
        .toBe(town2.coveyTownID);
      expect(towns[0].friendlyName)
        .toBe(town2.friendlyName);
    });
    it('Should not include deleted towns', async () => {
      const town = createTownForTesting(undefined, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(towns.length)
        .toBe(1);
      const res = CoveyTownsStore.getInstance()
        .deleteTown(town.coveyTownID, town.townUpdatePassword);
      expect(res)
        .toBe(true);
      const townsPostDelete = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(townsPostDelete.length)
        .toBe(0);
    });
  });
  describe('listMergeableTowns', () => {
    it('Should only include mergeable towns', async () => {
      const town = createTownForTesting(undefined, true, true);
      const town2 = createTownForTesting(undefined, true, false);
      const towns = CoveyTownsStore.getInstance()
        .getMergeableTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID || 
          townInfo.friendlyName === town2.friendlyName || townInfo.coveyTownID === town2.coveyTownID );
      expect(towns.length)
        .toBe(1);
      const town3 = createTownForTesting(undefined, true, true);
      const towns2 = CoveyTownsStore.getInstance()
        .getMergeableTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID || 
          townInfo.friendlyName === town2.friendlyName || townInfo.coveyTownID === town2.coveyTownID || 
          townInfo.friendlyName === town3.friendlyName || townInfo.coveyTownID === town3.coveyTownID );
      expect(towns2.length)
        .toBe(2);
    });
    it('Should not include private towns even if mergeable', async () => {
      const town = createTownForTesting(undefined, true, true);
      const town2 = createTownForTesting(undefined, false, true);
      const towns = CoveyTownsStore.getInstance()
        .getMergeableTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID || 
          townInfo.friendlyName === town2.friendlyName || townInfo.coveyTownID === town2.coveyTownID );
      expect(towns.length)
        .toBe(1);
    });
    it('Should not include private mergeable towns, even if there is a public mergeable town of same name', async () => {
      const town = createTownForTesting(undefined, false, true);
      const town2 = createTownForTesting(town.friendlyName, true, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(towns.length)
        .toBe(1);
      expect(towns[0].coveyTownID)
        .toBe(town2.coveyTownID);
      expect(towns[0].friendlyName)
        .toBe(town2.friendlyName);
    });
    it('Should not include deleted towns', async () => {
      const town = createTownForTesting(undefined, true, true);
      const towns = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(towns.length)
        .toBe(1);
      const res = CoveyTownsStore.getInstance()
        .deleteTown(town.coveyTownID, town.townUpdatePassword);
      expect(res)
        .toBe(true);
      const townsPostDelete = CoveyTownsStore.getInstance()
        .getTowns()
        .filter(townInfo => townInfo.friendlyName === town.friendlyName || townInfo.coveyTownID === town.coveyTownID);
      expect(townsPostDelete.length)
        .toBe(0);
    });
  });
  describe('mergeTowns', () => {
    it('Should check the password before merging', () => {
      const town = createTownForTesting('friendlyName', true, true);
      const { friendlyName } = town;

      const town2 = createTownForTesting('friendlyName2', true, true);
      const { friendlyName: friendlyName2 } = town2;

      const res = CoveyTownsStore.getInstance().mergeTowns(town.coveyTownID, town2.coveyTownID, 'wrongPassword', 
        'newTownFriendlyName', false, false);
      expect(res)
        .toBeUndefined();
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town2.friendlyName)
        .toBe(friendlyName2);
      expect(town.isPubliclyListed)
        .toBe(true);
      expect(town2.isPubliclyListed)
        .toBe(true); 
      expect(town.isMergeable)
        .toBe(true);
      expect(town2.isMergeable)
        .toBe(true);
    });
    it('Should fail if the requested townID does not exist', async () => {
      const town = createTownForTesting('friendlyName', true, true);
      const { friendlyName } = town;

      const town2 = createTownForTesting('friendlyName2', true, true);
      const { friendlyName: friendlyName2 } = town2;

      const res = CoveyTownsStore.getInstance().mergeTowns('fakeLOL', town2.coveyTownID, town.townUpdatePassword, 
        'newTownFriendlyName', false, false);
      expect(res)
        .toBeUndefined();
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town2.friendlyName)
        .toBe(friendlyName2);
      expect(town.isPubliclyListed)
        .toBe(true);
      expect(town2.isPubliclyListed)
        .toBe(true); 
      expect(town.isMergeable)
        .toBe(true);
      expect(town2.isMergeable)
        .toBe(true);
    });
    it('Should fail if the destination townID does not exist', async () => {
      const town = createTownForTesting('friendlyName', true, true);
      const { friendlyName } = town;

      const town2 = createTownForTesting('friendlyName2', true, true);
      const { friendlyName: friendlyName2 } = town2;

      const res = CoveyTownsStore.getInstance().mergeTowns(town.coveyTownID, 'fakeLOL', town.townUpdatePassword, 
        'newTownFriendlyName', false, false);
      expect(res)
        .toBeUndefined();
      expect(town.friendlyName)
        .toBe(friendlyName);
      expect(town2.friendlyName)
        .toBe(friendlyName2);
      expect(town.isPubliclyListed)
        .toBe(true);
      expect(town2.isPubliclyListed)
        .toBe(true); 
      expect(town.isMergeable)
        .toBe(true);
      expect(town2.isMergeable)
        .toBe(true);
    });
    it('checking that mergeTowns has expected values', async () => {
      const town = createTownForTesting('friendlyName', true, true);
      const town2 = createTownForTesting('friendlyName2', true, true);

      jest.setTimeout(15000);

      const res2 = CoveyTownsStore.getInstance().mergeTowns(town.coveyTownID, town2.coveyTownID, town.townUpdatePassword, 
        'newTownFriendlyName', false, false);

      const pause = (ms: number) => new Promise(res => setTimeout(res, ms));
      await pause(7000);
      
      expect(res2).toBeDefined();
      expect(town.friendlyName)
        .toBe('newTownFriendlyName');
      expect(town.isPubliclyListed)
        .toBe(false);
      expect(town.isMergeable)
        .toBe(false);
        
    });
  });
});
