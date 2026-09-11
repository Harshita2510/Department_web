import { AuditLog } from '../models/audit-log.model.js';

export function recordAudit(request, action, resourceType, resourceId, metadata = {}) {
  return AuditLog.create({ actor: request.user?._id, action, resourceType, resourceId: String(resourceId || ''), metadata, ip: request.ip, userAgent: request.get('user-agent') });
}
