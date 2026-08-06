import { Controller, Post, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ChecklistExecutionsService } from './checklist-executions.service';
import { CreateChecklistExecutionDto } from './dto/create-checklist-execution.dto';
import { PatchChecklistItemDto } from './dto/patch-checklist-item.dto';
import { CompleteChecklistExecutionDto } from './dto/complete-checklist-execution.dto';
import { CancelChecklistExecutionDto } from './dto/cancel-checklist-execution.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChecklistExecutionsController {
  constructor(private readonly checklistService: ChecklistExecutionsService) {}

  @Post('work-orders/:id/checklist-executions')
  @HttpCode(HttpStatus.CREATED)
  async createExecution(
    @Param('id') workOrderId: string,
    @Body() dto: CreateChecklistExecutionDto
  ) {
    return this.checklistService.createExecution(workOrderId, dto);
  }

  @Get('work-orders/:id/checklist-executions')
  async getExecutions(@Param('id') workOrderId: string) {
    return this.checklistService.getExecutionsForWorkOrder(workOrderId);
  }

  @Get('checklist-executions/:executionId')
  async getExecutionById(@Param('executionId') executionId: string) {
    return this.checklistService.getExecutionById(executionId);
  }

  @Patch('checklist-executions/:executionId/items')
  async updateItem(
    @Param('executionId') executionId: string,
    @Body() dto: PatchChecklistItemDto
  ) {
    return this.checklistService.updateItem(executionId, dto);
  }

  @Post('checklist-executions/:executionId/complete')
  async completeExecution(
    @Param('executionId') executionId: string,
    @Body() dto: CompleteChecklistExecutionDto
  ) {
    return this.checklistService.completeExecution(executionId, dto);
  }

  @Post('checklist-executions/:executionId/cancel')
  async cancelExecution(
    @Param('executionId') executionId: string,
    @Body() dto: CancelChecklistExecutionDto
  ) {
    return this.checklistService.cancelExecution(executionId, dto);
  }
}
