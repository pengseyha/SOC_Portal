export function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim()
    .replace('::ffff:', '');
}

export function getActor(req) {
  return {
    userId: req.user?.id || null,
    username: req.user?.username || req.body?.username || req.body?.identifier || 'anonymous',
    sourceIp: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}
