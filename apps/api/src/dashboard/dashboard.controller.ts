import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({
    summary: 'KPIs y series del dashboard (ventas por día, top productos, valor de inventario por categoría)',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '7 u 30' })
  summary(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    const clamped = days === 30 ? 30 : 7;
    return this.dashboard.summary(clamped).then((data) => ({ data }));
  }
}
