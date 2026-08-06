import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('uploadedById') uploadedById?: string,
    @Body('description') description?: string
  ) {
    return this.attachmentsService.uploadFile(
      file,
      entityType,
      entityId,
      uploadedById,
      description
    );
  }

  @Get()
  async getAttachments(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string
  ) {
    return this.attachmentsService.getAttachmentsForEntity(entityType, entityId);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const fileInfo = await this.attachmentsService.downloadFile(id);
    res.setHeader('Content-Type', fileInfo.fileType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`
    );
    return res.sendFile(fileInfo.fullPath);
  }

  @Get(':id/view')
  async viewFile(@Param('id') id: string, @Res() res: Response) {
    const fileInfo = await this.attachmentsService.downloadFile(id);
    res.setHeader('Content-Type', fileInfo.fileType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileInfo.originalName)}"`
    );
    return res.sendFile(fileInfo.fullPath);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('id') id: string,
    @Query('expectedVersion') expectedVersionStr: string
  ) {
    const expectedVersion = parseInt(expectedVersionStr, 10);
    await this.attachmentsService.deleteFile(id, isNaN(expectedVersion) ? 1 : expectedVersion);
  }
}
