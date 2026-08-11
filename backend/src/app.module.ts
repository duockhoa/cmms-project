import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { RequestsModule } from './modules/requests/requests.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { UsersModule } from './modules/users/users.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ChecklistExecutionsModule } from './modules/checklist-executions/checklist-executions.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EquipmentModule,
    RequestsModule,
    WorkOrdersModule,
    SchedulesModule,
    InventoryModule,
    AnalyticsModule,
    UsersModule,
    AttachmentsModule,
    ChecklistExecutionsModule,
    AuthModule,
    HealthModule,
    SettingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
