import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForecastService } from './forecast.service';

@ApiTags('Forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecast')
export class ForecastController {
  constructor(private forecastService: ForecastService) {}

  @Get()
  @ApiOperation({ summary: 'Get projected subscription charges forecast' })
  getForecast(@Request() req: { user: { id: string } }) {
    return this.forecastService.getForecast(req.user.id);
  }
}
