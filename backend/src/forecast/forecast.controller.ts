import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecast')
export class ForecastController {
  @Get()
  @ApiOperation({ summary: 'Get expense forecast (stub)' })
  getForecast(@Request() req: { user: { id: string } }) {
    return { message: 'Forecast not yet implemented', userId: req.user.id };
  }
}
