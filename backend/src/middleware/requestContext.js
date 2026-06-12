import { getActor } from '../utils/request.js';

export function requestContext(req, _res, next) {
  req.actor = getActor(req);
  next();
}
