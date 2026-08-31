import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { InventoryService } from './inventory.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get('kardex/:productId')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Kardex: historial de movimientos de un producto' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  kardex(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.inventory.kardex(productId, page, limit);
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Productos en o bajo su stock mínimo' })
  lowStock() {
    return this.inventory.lowStock();
  }

  @Post('adjustments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ajuste manual de inventario (solo Administrador)' })
  adjust(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdjustmentDto) {
    return this.inventory.adjust(user.sub, dto).then((data) => ({ data }));
  }
}
