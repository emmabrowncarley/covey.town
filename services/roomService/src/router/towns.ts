import { Express } from 'express';
import BodyParser from 'body-parser';
import io from 'socket.io';
import { Server } from 'http';
import { StatusCodes } from 'http-status-codes';
import {
  townCreateHandler, townDeleteHandler,
  townJoinHandler,
  townListHandler,
  townMergeableListHandler,
  townMergeRequestHandler,
  townSubscriptionHandler,
  townUpdateHandler,
} from '../requestHandlers/CoveyTownRequestHandlers';
import { logError } from '../Utils';

export default function addTownRoutes(http: Server, app: Express): io.Server {
  /*
   * Create a new session (aka join a town)
   */
  app.post('/sessions', BodyParser.json(), async (req, res) => {
    try {
      const result = await townJoinHandler({
        userName: req.body.userName,
        coveyTownID: req.body.coveyTownID,
      });
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });

  /**
   * Delete a town
   */
  app.delete('/towns/:townID/:townPassword', BodyParser.json(), async (req, res) => {
    try {
      const result = await townDeleteHandler({
        coveyTownID: req.params.townID,
        coveyTownPassword: req.params.townPassword,
      });
      res.status(200)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(500)
        .json({
          message: 'Internal server error, please see log in server for details',
        });
    }
  });
  /**
   * Merges two towns
   */
  app.patch('/towns', BodyParser.json(), async (req, res) => {
    try {
      const result = await townMergeRequestHandler({
        destinationCoveyTownID: req.body.destinationCoveyTownID,
        requestedCoveyTownID: req.body.requestedCoveyTownID,
        coveyTownPassword: req.body.coveyTownPassword,
        newTownFriendlyName: req.body.newTownFriendlyName,
        newTownIsPubliclyListed: req.body.newTownIsPubliclyListed,
        newTownIsMergeable: req.body.newTownIsMergeable,
      });
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });
  /**
   * List all towns
   */
  app.get('/towns', BodyParser.json(), async (_req, res) => {
    try {
      const result = await townListHandler();
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });

  /**
  * List all mergeable towns
  */
  app.get('/mergeabletowns', BodyParser.json(), async (_req, res) => {
    try {
      const result = await townMergeableListHandler();
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });

  /**
   * Create a town
   */
  app.post('/towns', BodyParser.json(), async (req, res) => {
    try {
      const result = await townCreateHandler(req.body);
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });
  /**
   * Update a town
   */
  app.patch('/towns/:townID', BodyParser.json(), async (req, res) => {
    try {
      const result = await townUpdateHandler({
        coveyTownID: req.params.townID,
        isPubliclyListed: req.body.isPubliclyListed,
        friendlyName: req.body.friendlyName,
        coveyTownPassword: req.body.coveyTownPassword,
        isMergeable: req.body.isMergeable,
      });
      res.status(StatusCodes.OK)
        .json(result);
    } catch (err) {
      logError(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({
          message: 'Internal server error, please see log in server for more details',
        });
    }
  });

  const socketServer = new io.Server(http, { cors: { origin: '*' } });
  socketServer.on('connection', townSubscriptionHandler);
  return socketServer;
}
