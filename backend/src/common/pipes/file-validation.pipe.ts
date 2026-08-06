import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSizeBytes: number;
  private readonly allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor(private readonly configService: ConfigService) {
    const maxSizeMb = this.configService.get<number>('MAX_ATTACHMENT_SIZE_MB') || 5;
    this.maxSizeBytes = maxSizeMb * 1024 * 1024;
  }

  transform(file: any) {
    if (!file) {
      throw new BadRequestException('File đính kèm không được để trống.');
    }

    // 1. Validate file size
    if (file.size > this.maxSizeBytes) {
      const maxSizeMb = this.maxSizeBytes / (1024 * 1024);
      throw new BadRequestException(`Kích thước file vượt quá giới hạn cho phép (${maxSizeMb}MB).`);
    }

    // 2. Validate basic mime-type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Định dạng file không hỗ trợ.');
    }

    // 3. Verify magic numbers (actual content format check)
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('File lỗi hoặc không hợp lệ.');
    }

    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    
    // Match common magic numbers
    const isPng = hex === '89504E47';
    const isPdf = hex === '25504446'; // %PDF
    const isGif = hex === '47494638'; // GIF8
    const isJpeg = hex.startsWith('FFD8FF');
    const isZipOrOffice = hex === '504B0304'; // PK.. (Zip, docx, xlsx)

    if (!isPng && !isPdf && !isGif && !isJpeg && !isZipOrOffice) {
      throw new BadRequestException('Nội dung file thực tế không hợp lệ.');
    }

    return file;
  }
}
