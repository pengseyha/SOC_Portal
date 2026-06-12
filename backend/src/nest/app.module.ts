import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AdminController, AuthController, ContactController, DashboardController, HealthController, LogsController, ProfileController, UploadsController } from './controllers.js';
import { AllExceptionsFilter } from './exception.filter.js';

@Module({
  controllers: [HealthController, AuthController, ContactController, ProfileController, AdminController, LogsController, DashboardController, UploadsController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }]
})
export class AppModule {}
