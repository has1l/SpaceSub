import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionCodeService } from './connection-code.service';
import { RedeemCodeDto } from './dto/redeem-code.dto';

@ApiTags('Connection Code')
@Controller('connection-code')
export class ConnectionCodeController {
  private readonly logger = new Logger(ConnectionCodeController.name);

  constructor(private connectionCodeService: ConnectionCodeService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Generate a one-time connection code',
    description:
      'Generates a short-lived code (FB-XXXXXX) that can be used in SpaceSub to connect this bank account. The code expires in 5 minutes and can only be used once.',
  })
  async generate(@Request() req: { user: { id: string } }) {
    const { code, expiresAt } = await this.connectionCodeService.generateCode(
      req.user.id,
    );
    return { code, expiresAt: expiresAt.toISOString() };
  }

  @Post('redeem')
  @ApiOperation({
    summary: 'Redeem a connection code (server-to-server)',
    description:
      'Validates and consumes a connection code by its SHA-256 hash. Returns the decrypted access token. This endpoint is meant for server-to-server calls from SpaceSub backend.',
  })
  async redeem(@Body() dto: RedeemCodeDto) {
    const result = await this.connectionCodeService.redeemByHash(dto.codeHash);

    if (!result) {
      throw new UnauthorizedException('Invalid, expired, or already used connection code');
    }

    if (result === 'BLOCKED') {
      throw new ForbiddenException('Too many attempts. Code is blocked.');
    }

    this.logger.log('Connection code redeemed via server-to-server call');
    return { accessToken: result.accessToken };
  }
}
