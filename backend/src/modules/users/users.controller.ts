import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';

@ApiTags('Người dùng')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiStandardResponse({
    summary: 'Lấy danh sách người dùng đang hoạt động',
    method: 'GET',
    path: '/users',
  })
  // We keep this extra ApiResponse to show the exact JSON schema example you wanted
  @ApiResponse({
    status: 200,
    description: 'Get or update data thành công',
    schema: {
      example: [
        {
          id: 1,
          username: 'nguyen.van.a',
          name: 'Nguyễn Văn A',
          email: 'nguyen.van.a@example.com',
          department: 'QA',
          position: 'Nhân viên',
          status: 'active',
          created_at: '2026-08-12T13:00:00.000Z',
          updated_at: '2026-08-12T13:00:00.000Z',
        },
      ],
    },
  })
  @Get()
  async getUsers(
    @Query('role') role?: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const isIncludeInactive = includeInactive === 'true';
    return this.usersService.getUsers(role, isIncludeInactive);
  }

  @ApiStandardResponse({
    summary: 'Lấy danh sách phòng ban',
    method: 'GET',
    path: '/users/departments',
  })
  @Get('departments')
  async getDepartments() {
    return this.usersService.getDepartments();
  }

  @ApiStandardResponse({
    summary: 'Lấy chi tiết user theo ID',
    method: 'GET',
    path: '/users/{id}',
  })
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @ApiStandardResponse({
    summary: 'Cập nhật hồ sơ kỹ thuật',
    method: 'PATCH',
    path: '/users/{id}/technical-profile',
  })
  @Patch(':id/technical-profile')
  async updateTechnicalProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTechnicalProfileDto
  ) {
    return this.usersService.updateTechnicalProfile(id, dto);
  }

  @ApiStandardResponse({
    summary: 'Cập nhật trạng thái bận rộn',
    method: 'PATCH',
    path: '/users/:id/availability',
  })
  @Patch(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto
  ) {
    return this.usersService.updateAvailability(id, dto);
  }

  @ApiStandardResponse({
    summary: 'Cập nhật phân quyền (Role) cho người dùng',
    method: 'PATCH',
    path: '/users/:id/role',
  })
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() body: { roleId: string | null }
  ) {
    return this.usersService.updateRole(id, body.roleId);
  }
}
