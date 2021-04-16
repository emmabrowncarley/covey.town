import Express from 'express';
import CORS from 'cors';
import http from 'http';
import { nanoid } from 'nanoid';
import assert from 'assert';
import { AddressInfo } from 'net';
import { mock } from 'jest-mock-extended';
import TownsServiceClient, { TownListResponse } from './TownsServiceClient';
import addTownRoutes from '../router/towns';
import CoveyTownsStore from '../lib/CoveyTownsStore';
import CoveyTownListener from '../types/CoveyTownListener';

type TestTownData = {
  friendlyName: string, coveyTownID: string,
  isPubliclyListed: boolean, townUpdatePassword: string, isMergeable?: boolean
};
// var i = 0;
// var j = 0;
function expectTownListMatches(towns: TownListResponse, town: TestTownData) {
  const matching = towns.towns.find(townInfo => townInfo.coveyTownID === town.coveyTownID);
  if (town.isPubliclyListed) {
    expect(matching)
      .toBeDefined();
    assert(matching);
    expect(matching.friendlyName)
      .toBe(town.friendlyName);
    if (matching.isMergeable !== undefined && town.isMergeable){
      expect(matching.isMergeable).toBe(town.isMergeable);
    }
  } else {
    expect(matching).toBeUndefined();
  }
}

describe('TownsServiceAPIREST', () => {
  let server: http.Server;
  let apiClient: TownsServiceClient;

  async function createTownForTesting(friendlyNameToUse?: string, isPublic = false, isMergeable?: boolean): Promise<TestTownData> {
    const friendlyName = friendlyNameToUse !== undefined ? friendlyNameToUse :
      `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
    let ret;
    if (isMergeable !== undefined) {
      ret = await apiClient.createTown({
        friendlyName,
        isPubliclyListed: isPublic,
        isMergeable,
      });

      return {
        friendlyName,
        isPubliclyListed: isPublic,
        coveyTownID: ret.coveyTownID,
        townUpdatePassword: ret.coveyTownPassword,
        isMergeable,
      };
    } 
    ret = await apiClient.createTown({
      friendlyName,
      isPubliclyListed: isPublic,
      isMergeable: true,
    });
    
    return {
      friendlyName,
      isPubliclyListed: isPublic,
      coveyTownID: ret.coveyTownID,
      townUpdatePassword: ret.coveyTownPassword,
    };
  }

  beforeAll(async () => {
    const app = Express();
    app.use(CORS());
    server = http.createServer(app);

    addTownRoutes(server, app);
    await server.listen();
    const address = server.address() as AddressInfo;

    apiClient = new TownsServiceClient(`http://127.0.0.1:${address.port}`);
  });
  afterAll(async () => {
    await server.close();
  });
  describe('CoveyTownCreateAPI', () => {
    it('Allows for multiple towns with the same friendlyName', async () => {
      const firstTown = await createTownForTesting();
      const secondTown = await createTownForTesting(firstTown.friendlyName);
      expect(firstTown.coveyTownID)
        .not
        .toBe(secondTown.coveyTownID);
    });
    it('Prohibits a blank friendlyName', async () => {
      try {
        await createTownForTesting('');
        fail('createTown should throw an error if friendly name is empty string');
      } catch (err) {
        // OK
      }
    });
  });

  describe('CoveyTownListAPI', () => {
    it('Lists public towns, but not private towns', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const privTown1 = await createTownForTesting(undefined, false);
      const pubTown2 = await createTownForTesting(undefined, true);
      const privTown2 = await createTownForTesting(undefined, false);

      const towns = await apiClient.listTowns();
      expectTownListMatches(towns, pubTown1);
      expectTownListMatches(towns, pubTown2);
      expectTownListMatches(towns, privTown1);
      expectTownListMatches(towns, privTown2);

    });
    it('Allows for multiple towns with the same friendlyName', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const privTown1 = await createTownForTesting(pubTown1.friendlyName, false);
      const pubTown2 = await createTownForTesting(pubTown1.friendlyName, true);
      const privTown2 = await createTownForTesting(pubTown1.friendlyName, false);

      const towns = await apiClient.listTowns();
      expectTownListMatches(towns, pubTown1);
      expectTownListMatches(towns, pubTown2);
      expectTownListMatches(towns, privTown1);
      expectTownListMatches(towns, privTown2);
    });
  });

  describe('CoveyTownMergeableListAPI', () => {
    it('Lists mergeable public towns, but not mergeable private towns', async () => {
      const pubTown1 = await createTownForTesting(undefined, true, true);
      const privTown1 = await createTownForTesting(undefined, false, true);
      const pubTown2 = await createTownForTesting(undefined, true, true);
      const privTown2 = await createTownForTesting(undefined, false, true);

      const towns = await apiClient.listMergeableTowns();

      expectTownListMatches(towns, pubTown1);
      expectTownListMatches(towns, pubTown2);
      expectTownListMatches(towns, privTown1);
      expectTownListMatches(towns, privTown2);

    });
    it('Lists mergeable public towns, but not nonmergeable public towns', async () => {
      const originalMergeableTowns = (await apiClient.listMergeableTowns()).towns.length;
      await createTownForTesting(undefined, true, true);
      const numAfterAddingMergeableTown = (await apiClient.listMergeableTowns()).towns.length;
      expect(numAfterAddingMergeableTown).toBe(originalMergeableTowns+1);

      await createTownForTesting(undefined, true, false); 
      const numAfterAddingNonmergeableTown = (await apiClient.listMergeableTowns()).towns.length;
      expect(numAfterAddingNonmergeableTown).toBe(numAfterAddingMergeableTown);

    });
    it('Allows for multiple towns with the same friendlyName', async () => {
      const pubTown1 = await createTownForTesting(undefined, true, true);
      const privTown1 = await createTownForTesting(pubTown1.friendlyName, false, true);
      const pubTown2 = await createTownForTesting(pubTown1.friendlyName, true, true);
      const privTown2 = await createTownForTesting(pubTown1.friendlyName, false, true);

      const towns = await apiClient.listMergeableTowns();
      expectTownListMatches(towns, pubTown1);
      expectTownListMatches(towns, pubTown2);
      expectTownListMatches(towns, privTown1);
      expectTownListMatches(towns, privTown2);
    });
  });

  describe('CoveyTownDeleteAPI', () => {
    it('Throws an error if the password is invalid', async () => {
      const { coveyTownID } = await createTownForTesting(undefined, true);
      try {
        await apiClient.deleteTown({
          coveyTownID,
          coveyTownPassword: nanoid(),
        });
        fail('Expected deleteTown to throw an error');
      } catch (e) {
        // Expected error
      }
    });
    it('Throws an error if the townID is invalid', async () => {
      const { townUpdatePassword } = await createTownForTesting(undefined, true);
      try {
        await apiClient.deleteTown({
          coveyTownID: nanoid(),
          coveyTownPassword: townUpdatePassword,
        });
        fail('Expected deleteTown to throw an error');
      } catch (e) {
        // Expected error
      }
    });
    it('Deletes a town if given a valid password and town, no longer allowing it to be joined or listed', async () => {
      const { coveyTownID, townUpdatePassword } = await createTownForTesting(undefined, true);
      await apiClient.deleteTown({
        coveyTownID,
        coveyTownPassword: townUpdatePassword,
      });
      try {
        await apiClient.joinTown({
          userName: nanoid(),
          coveyTownID,
        });
        fail('Expected joinTown to throw an error');
      } catch (e) {
        // Expected
      }
      const listedTowns = await apiClient.listTowns();
      if (listedTowns.towns.find(r => r.coveyTownID === coveyTownID)) {
        fail('Expected the deleted town to no longer be listed');
      }
    });
  });
  describe('CoveyTownUpdateAPI', () => {
    it('Checks the password before updating any values', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      try {
        await apiClient.updateTown({
          coveyTownID: pubTown1.coveyTownID,
          coveyTownPassword: `${pubTown1.townUpdatePassword}*`,
          friendlyName: 'broken',
          isPubliclyListed: false,
        });
        fail('updateTown with an invalid password should throw an error');
      } catch (err) {
        // err expected
        // TODO this should really check to make sure it's the *right* error, but we didn't specify
        // the format of the exception :(
      }

      // Make sure name or vis didn't change
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
    });
    it('Updates the friendlyName and visbility as requested', async () => {
      const pubTown1 = await createTownForTesting(undefined, false);
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      await apiClient.updateTown({
        coveyTownID: pubTown1.coveyTownID,
        coveyTownPassword: pubTown1.townUpdatePassword,
        friendlyName: 'newName',
        isPubliclyListed: true,
      });
      pubTown1.friendlyName = 'newName';
      pubTown1.isPubliclyListed = true;
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
    });
    it('Updates the mergeability as requested', async () => {
      const pubTown1 = await createTownForTesting(undefined, true, false);
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      await apiClient.updateTown({
        coveyTownID: pubTown1.coveyTownID,
        coveyTownPassword: pubTown1.townUpdatePassword,
        isMergeable: true,
      });
      pubTown1.isMergeable = true;
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
    });
    it('Does not update the visibility if visibility is undefined', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      await apiClient.updateTown({
        coveyTownID: pubTown1.coveyTownID,
        coveyTownPassword: pubTown1.townUpdatePassword,
        friendlyName: 'newName2',
      });
      pubTown1.friendlyName = 'newName2';
      expectTownListMatches(await apiClient.listTowns(), pubTown1);
    });
  });

  describe('CoveyMemberAPI', () => {
    it('Throws an error if the town does not exist', async () => {
      await createTownForTesting(undefined, true);
      try {
        await apiClient.joinTown({
          userName: nanoid(),
          coveyTownID: nanoid(),
        });
        fail('Expected an error to be thrown by joinTown but none thrown');
      } catch (err) {
        // OK, expected an error
        // TODO this should really check to make sure it's the *right* error, but we didn't specify
        // the format of the exception :(
      }
    });
    it('Admits a user to a valid public or private town', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const privTown1 = await createTownForTesting(undefined, false);
      const res = await apiClient.joinTown({
        userName: nanoid(),
        coveyTownID: pubTown1.coveyTownID,
      });
      expect(res.coveySessionToken)
        .toBeDefined();
      expect(res.coveyUserID)
        .toBeDefined();

      const res2 = await apiClient.joinTown({
        userName: nanoid(),
        coveyTownID: privTown1.coveyTownID,
      });
      expect(res2.coveySessionToken)
        .toBeDefined();
      expect(res2.coveyUserID)
        .toBeDefined();

    });
    it('Trying to join a room that is undergoing a merge', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);

      const store = CoveyTownsStore.getInstance();
      const townController = store.getControllerForTown(pubTown1.coveyTownID);
      if (townController){
        townController.isJoinable = false;
      }

      try {
        await apiClient.joinTown({
          userName: nanoid(),
          coveyTownID: pubTown1.coveyTownID,
        });
        fail('request town id is blank');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Town is merging and cannot be joined at this time');
      }
    });
  });

  describe('mergeTowns', () => {
    it('Successfully merges two towns', async () => {
      const pubTown1 = await createTownForTesting(undefined, true, true);
      const pubTown2 = await createTownForTesting(undefined, true, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);

      const mergedTown = await apiClient.mergeTowns({
        destinationCoveyTownID: pubTown1.coveyTownID,
        requestedCoveyTownID: pubTown2.coveyTownID,
        coveyTownPassword: pubTown1.townUpdatePassword, 
        newTownFriendlyName: 'mergedTown', 
        newTownIsPubliclyListed: true, 
        newTownIsMergeable: true,
      });

      expect(mergedTown.coveyTownID).toBe(pubTown1.coveyTownID);

    });
    it('Requested coveyTownID is blank', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: '',
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Please specify a town to merge with');
      }
    });
    it('requested town does not exist', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: 'does not exist',
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: No such town');
      }
    });
    it('destination town does not exist', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: 'does not exist',
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: No such town');
      }
    });
    it('Trying to merge with a nonmergeable town', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true, false);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Specified town cannot be merged with. Please select a different town');
      }
    });
    it('Too big occupancy', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      const store = CoveyTownsStore.getInstance();
      const townController1 = store.getControllerForTown(pubTown1.coveyTownID);
      let i = 0;
      while (i < 50) {
        townController1?.addTownListener(mock<CoveyTownListener>());
        i+=1;
      }

      const townController2 = store.getControllerForTown(pubTown2.coveyTownID);
      let j = 0;
      while (j < 10){
        townController2?.addTownListener(mock<CoveyTownListener>());
        j+=1;
      }

      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: The combined occupancy of these two towns is greater than 50 and cannot be merged at this time');
      }
    });
    it('Password is wrong', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: '', 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Invalid password. Please double check your town update password.');
      }
    });
    it('Empty new town name', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      expectTownListMatches(await apiClient.listTowns(), pubTown1);
      expectTownListMatches(await apiClient.listTowns(), pubTown2);
      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: '', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Must specify a name for the new town');
      }
    });
    it('Trying to merge with a room that is already undergoing a merge', async () => {
      const pubTown1 = await createTownForTesting(undefined, true);
      const pubTown2 = await createTownForTesting(undefined, true);

      const store = CoveyTownsStore.getInstance();
      const townController = store.getControllerForTown(pubTown2.coveyTownID);
      if (townController){
        townController.isJoinable = false;
      }

      try {
        await apiClient.mergeTowns({
          destinationCoveyTownID: pubTown1.coveyTownID,
          requestedCoveyTownID: pubTown2.coveyTownID,
          coveyTownPassword: pubTown1.townUpdatePassword, 
          newTownFriendlyName: 'mergedTown', 
          newTownIsPubliclyListed: true, 
          newTownIsMergeable: true,
        });
        fail('Expected an error to be thrown by mergeTowns but none thrown');
      } catch (err) {
        expect(err.toString()).toBe('Error: Error processing request: Specified town is currently undergoing a merge and cannot be merged with. Please select a different town');
      }
    });
  });
});
