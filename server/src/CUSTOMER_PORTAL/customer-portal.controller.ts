import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Public } from '../shared/decorator/public.decorator';
import { DataResponseDto } from '../shared/dto/data-response.dto';
import { CustomerPortalService } from './customer-portal.service';
import {
  PortalAuthDto,
  PortalMakePaymentDto,
  PortalCreateServiceRequestDto,
} from './dto/customer-portal.dto';

@ApiTags('Customer Portal')
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(
    private readonly customerPortalService: CustomerPortalService,
  ) {}

  @Public()
  @Get('locations')
  @ApiOperation({ summary: 'Get all service locations (public, for guest form)' })
  async getServiceLocations() {
    const locations = await this.customerPortalService.getServiceLocations();
    return DataResponseDto.success(locations, 'Service locations fetched successfully');
  }

  @Public()
  @Post('auth')
  @ApiOperation({
    summary: 'Authenticate customer with email and reference number',
  })
  async authenticate(@Body() dto: PortalAuthDto) {
    const result = await this.customerPortalService.authenticate(dto);
    return DataResponseDto.success(result, 'Authentication successful');
  }

  @Public()
  @Get('service-requests')
  @ApiOperation({ summary: 'Get all service requests for authenticated customer' })
  @ApiHeader({ name: 'x-portal-token', description: 'Portal access token' })
  async getServiceRequests(
    @Headers('x-portal-token') token: string,
  ) {
    const requests = await this.customerPortalService.getServiceRequests(token);
    return DataResponseDto.success(
      requests,
      'Service requests fetched successfully',
    );
  }

  @Public()
  @Get('service-requests/:id/track')
  @ApiOperation({
    summary: 'Track a specific service request with related work orders',
  })
  @ApiHeader({ name: 'x-portal-token', description: 'Portal access token' })
  async trackServiceRequest(
    @Param('id') id: string,
    @Headers('x-portal-token') token: string,
  ) {
    const result = await this.customerPortalService.trackServiceRequest(
      token,
      id,
    );
    return DataResponseDto.success(result, 'Service request tracked successfully');
  }

  @Public()
  @Get('payment-history')
  @ApiOperation({
    summary: 'Get payment history (invoices and payments) for authenticated customer',
  })
  @ApiHeader({ name: 'x-portal-token', description: 'Portal access token' })
  async getPaymentHistory(
    @Headers('x-portal-token') token: string,
  ) {
    const result = await this.customerPortalService.getPaymentHistory(token);
    return DataResponseDto.success(
      result,
      'Payment history fetched successfully',
    );
  }

  @Public()
  @Get('service-history')
  @ApiOperation({
    summary: 'Get service history (work orders) for authenticated customer',
  })
  @ApiHeader({ name: 'x-portal-token', description: 'Portal access token' })
  async getServiceHistory(
    @Headers('x-portal-token') token: string,
  ) {
    const history = await this.customerPortalService.getServiceHistory(token);
    return DataResponseDto.success(
      history,
      'Service history fetched successfully',
    );
  }

  @Public()
  @Get('work-orders/:woNumber')
  @ApiOperation({ summary: 'Get full work order details by WO number (e.g. WO-000001)' })
  async getWorkOrderByNumber(@Param('woNumber') woNumber: string) {
    const result = await this.customerPortalService.getWorkOrderByNumber(woNumber);
    return DataResponseDto.success(result, 'Work order found');
  }

  @Public()
  @Get('track/:requestNumber')
  @ApiOperation({ summary: 'Track a service request by request number (e.g. SR-000005)' })
  async trackByRequestNumber(@Param('requestNumber') requestNumber: string) {
    const result = await this.customerPortalService.trackByRequestNumber(requestNumber);
    return DataResponseDto.success(result, 'Service request found');
  }

  @Public()
  @Post('service-requests')
  @ApiOperation({ summary: 'Create a guest service request from the public portal' })
  async createGuestServiceRequest(@Body() dto: PortalCreateServiceRequestDto) {
    const result = await this.customerPortalService.createGuestServiceRequest(dto);
    return DataResponseDto.created(result, 'Service request created successfully');
  }

  @Public()
  @Post('payments')
  @ApiOperation({ summary: 'Make a payment on an invoice' })
  async makePayment(@Body() dto: PortalMakePaymentDto) {
    const result = await this.customerPortalService.makePayment(dto);
    return DataResponseDto.created(result, 'Payment processed successfully');
  }

  @Public()
  @Post('work-orders/:woNumber/feedback')
  @ApiOperation({ summary: 'Submit customer feedback/review for a work order' })
  async submitFeedback(
    @Param('woNumber') woNumber: string,
    @Body() dto: { rating: number; comment?: string },
  ) {
    const result = await this.customerPortalService.submitFeedback(woNumber, dto);
    return DataResponseDto.created(result, 'Feedback submitted successfully');
  }
}
