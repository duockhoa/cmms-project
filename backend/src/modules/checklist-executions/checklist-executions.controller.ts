import { Controller, Post, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus, Req, ForbiddenException } from '@nestjs/common';
import { ChecklistExecutionsService } from './checklist-executions.service';
import { CreateChecklistExecutionDto } from './dto/create-checklist-execution.dto';
import { PatchChecklistItemDto } from './dto/patch-checklist-item.dto';
import { CompleteChecklistExecutionDto } from './dto/complete-checklist-execution.dto';
import { CancelChecklistExecutionDto } from './dto/cancel-checklist-execution.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { hasPermission } from '../../common/utils/rbac.helper';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChecklistExecutionsController {
  constructor(
    private readonly checklistService: ChecklistExecutionsService,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  private assertPermission(actor: any, permission: string) {
    if (!hasPermission(actor, permission)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác checklist này.');
    }
  }

  private async assertExecutionAccess(executionId: string, actor: any) {
    const execution = await this.checklistService.getExecutionById(executionId);
    await this.workOrdersService.findOne(execution.workOrderId, actor);
  }

  @Post('work-orders/:id/checklist-executions')
  @HttpCode(HttpStatus.CREATED)
  async createExecution(
    @Param('id') workOrderId: string,
    @Body() dto: CreateChecklistExecutionDto,
    @Req() req: any,
  ) {
    this.assertPermission(req.user, 'checklists:create');
    await this.workOrdersService.findOne(workOrderId, req.user);
    return this.checklistService.createExecution(workOrderId, dto);
  }

  @Get('work-orders/:id/checklist-executions')
  async getExecutions(@Param('id') workOrderId: string, @Req() req: any) {
    this.assertPermission(req.user, 'checklists:view');
    await this.workOrdersService.findOne(workOrderId, req.user);
    return this.checklistService.getExecutionsForWorkOrder(workOrderId);
  }

  @Get('checklist-executions/:executionId')
  async getExecutionById(@Param('executionId') executionId: string, @Req() req: any) {
    this.assertPermission(req.user, 'checklists:view');
    await this.assertExecutionAccess(executionId, req.user);
    return this.checklistService.getExecutionById(executionId);
  }

  @Patch('checklist-executions/:executionId/items')
  async updateItem(
    @Param('executionId') executionId: string,
    @Body() dto: PatchChecklistItemDto,
    @Req() req: any,
  ) {
    this.assertPermission(req.user, 'checklists:execute');
    await this.assertExecutionAccess(executionId, req.user);
    return this.checklistService.updateItem(executionId, dto);
  }

  @Post('checklist-executions/:executionId/complete')
  async completeExecution(
    @Param('executionId') executionId: string,
    @Body() dto: CompleteChecklistExecutionDto,
    @Req() req: any,
  ) {
    this.assertPermission(req.user, 'checklists:approve');
    await this.assertExecutionAccess(executionId, req.user);
    return this.checklistService.completeExecution(executionId, dto);
  }

  @Post('checklist-executions/:executionId/cancel')
  async cancelExecution(
    @Param('executionId') executionId: string,
    @Body() dto: CancelChecklistExecutionDto,
    @Req() req: any,
  ) {
    this.assertPermission(req.user, 'checklists:edit');
    await this.assertExecutionAccess(executionId, req.user);
    return this.checklistService.cancelExecution(executionId, dto);
  }
}
