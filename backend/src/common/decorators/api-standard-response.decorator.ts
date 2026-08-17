import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

interface StandardResponseOptions {
  summary: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  isPublic?: boolean;
}

export function ApiStandardResponse(options: StandardResponseOptions) {
  const isPost = options.method === 'POST';
  const successStatus = isPost ? 201 : 200;
  const successDesc = isPost
    ? 'Tạo hoặc thực hiện thao tác thành công'
    : 'Lấy hoặc cập nhật dữ liệu thành công';

  const decorators = [
    ApiOperation({
      summary: options.summary,
      description:
        options.description || `Thực hiện thao tác qua ${options.method} ${options.path}.`,
    }),
    ApiResponse({ status: successStatus, description: successDesc }),
    ApiResponse({
      status: 404,
      description: 'Không tìm thấy tài nguyên theo tham số trên URL',
    }),
  ];

  if (!options.isPublic) {
    decorators.push(ApiBearerAuth());
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Chưa xác thực hoặc access token không hợp lệ',
      }),
    );
  }

  // Common error for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(options.method)) {
    decorators.push(
      ApiResponse({
        status: 400,
        description: 'Dữ liệu không hợp lệ',
      }),
    );
  }

  return applyDecorators(...decorators);
}
