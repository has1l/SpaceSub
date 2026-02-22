import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integration')
export class IntegrationController {
  @Get('banks')
  @ApiOperation({ summary: 'Get connected banks (stub)' })
  getBanks(@Request() req: { user: { id: string } }) {
    return { message: 'Bank integration not yet implemented', userId: req.user.id };
  }

  @Post('banks/connect')
  @ApiOperation({ summary: 'Connect a bank (stub)' })
  connectBank(@Request() req: { user: { id: string } }) {
    return { message: 'Bank connection not yet implemented', userId: req.user.id };
  }

  @Get('email')
  @ApiOperation({ summary: 'Get email integration status (stub)' })
  getEmailStatus(@Request() req: { user: { id: string } }) {
    return { message: 'Email integration not yet implemented', userId: req.user.id };
  }

  @Post('email/connect')
  @ApiOperation({ summary: 'Connect email (stub)' })
  connectEmail(@Request() req: { user: { id: string } }) {
    return { message: 'Email connection not yet implemented', userId: req.user.id };
  }
}
