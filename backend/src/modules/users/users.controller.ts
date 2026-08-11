import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(
    @Query('role') role?: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    const isIncludeInactive = includeInactive === 'true';
    return this.usersService.getUsers(role, isIncludeInactive);
  }

  @Get('departments')
  async getDepartments() {
    return this.usersService.getDepartments();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/technical-profile')
  async updateTechnicalProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTechnicalProfileDto
  ) {
    return this.usersService.updateTechnicalProfile(id, dto);
  }

  @Patch(':id/availability')
  async updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto
  ) {
    return this.usersService.updateAvailability(id, dto);
  }
}
