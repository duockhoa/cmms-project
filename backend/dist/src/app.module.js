"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("./prisma/prisma.module");
const equipment_module_1 = require("./modules/equipment/equipment.module");
const requests_module_1 = require("./modules/requests/requests.module");
const work_orders_module_1 = require("./modules/work-orders/work-orders.module");
const schedules_module_1 = require("./modules/schedules/schedules.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const users_module_1 = require("./modules/users/users.module");
const attachments_module_1 = require("./modules/attachments/attachments.module");
const checklist_executions_module_1 = require("./modules/checklist-executions/checklist-executions.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            equipment_module_1.EquipmentModule,
            requests_module_1.RequestsModule,
            work_orders_module_1.WorkOrdersModule,
            schedules_module_1.SchedulesModule,
            inventory_module_1.InventoryModule,
            analytics_module_1.AnalyticsModule,
            users_module_1.UsersModule,
            attachments_module_1.AttachmentsModule,
            checklist_executions_module_1.ChecklistExecutionsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map