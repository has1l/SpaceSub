import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { TransactionsAnalysisService } from '../transactions/transactions-analysis.service';
import { TransactionsService } from '../transactions/transactions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private analysisService: TransactionsAnalysisService,
    private transactionsService: TransactionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a subscription' })
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  findAll(@Request() req: { user: { id: string } }) {
    return this.subscriptionsService.findAllByUser(req.user.id);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get subscription suggestions from transaction analysis',
  })
  async getSuggestions(@Request() req: { user: { id: string } }) {
    return this.analysisService.analyze(req.user.id);
  }

  @Post('suggestions/:id/confirm')
  @ApiOperation({
    summary: 'Confirm a suggestion and create a subscription',
  })
  async confirmSuggestion(
    @Param('id') suggestionId: string,
    @Request() req: { user: { id: string } },
  ) {
    const suggestion = this.analysisService.getSuggestionById(
      req.user.id,
      suggestionId,
    );
    if (!suggestion) {
      throw new NotFoundException(
        'Suggestion not found or expired. Call GET /subscriptions/suggestions first.',
      );
    }

    const subscription = await this.subscriptionsService.createFromSuggestion(
      req.user.id,
      suggestion,
    );

    await this.transactionsService.linkToSubscription(
      suggestion.transactionIds,
      subscription.id,
    );

    this.analysisService.removeSuggestion(req.user.id, suggestionId);

    return { subscription, linkedTransactions: suggestion.transactionIds.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID' })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.subscriptionsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription' })
  remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.subscriptionsService.remove(id, req.user.id);
  }
}
