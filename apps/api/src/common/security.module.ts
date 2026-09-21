import { Module, Global } from '@nestjs/common';
import { SecurityService, AuthGuard, RolesGuard, RateLimitGuard, AuditService } from './security';

@Global()
@Module({
  providers: [SecurityService, AuthGuard, RolesGuard, RateLimitGuard, AuditService],
  exports: [SecurityService, AuthGuard, RolesGuard, RateLimitGuard, AuditService],
})
export class SecurityModule {}
