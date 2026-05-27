import { Injectable, Inject, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { REPOSITORY } from '../shared/constants/keynames';
import { Tenant } from '../TENANTS/tenants.entity';
import { User } from '../USERS/users.entity';
import { ServiceRequest } from '../SERVICE_REQUESTS/service_requests.entity';
import { WorkOrder } from '../WORK_ORDERS/work_orders.entity';
import { Invoice } from '../INVOICES/invoices.entity';
import { TenantsService } from '../TENANTS/tenants.service';

// Note: USERS and SERVICE_REQUESTS repositories are provided locally in SuperAdminModule
// to enable cross-tenant queries without being constrained by tenant-scoped services.

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly tenantsService: TenantsService,
    @Inject(REPOSITORY.TENANTS)
    private readonly tenantRepository: typeof Tenant,
    @Inject(REPOSITORY.USERS)
    private readonly userRepository: typeof User,
    @Inject(REPOSITORY.SERVICE_REQUESTS)
    private readonly serviceRequestRepository: typeof ServiceRequest,
    @Inject(REPOSITORY.WORK_ORDERS)
    private readonly workOrderRepository: typeof WorkOrder,
    @Inject(REPOSITORY.INVOICES)
    private readonly invoiceRepository: typeof Invoice,
  ) {}

  async listTenants() {
    const tenants = await this.tenantRepository.findAll({
      attributes: ['id', 'name', 'slug', 'subscription_plan', 'max_users', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    // Attach counts and admin email to each tenant
    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, srCount, adminUser] = await Promise.all([
          this.userRepository.count({ where: { tenant_id: tenant.id, is_deleted: false } }),
          this.serviceRequestRepository.count({ where: { tenant_id: tenant.id, is_deleted: false } }),
          this.userRepository.findOne({
            where: { tenant_id: tenant.id, is_deleted: false, is_active: true },
            attributes: ['id', 'email'],
            order: [['created_at', 'ASC']],
          }),
        ]);
        return {
          ...tenant.toJSON(),
          user_count: userCount,
          service_request_count: srCount,
          admin_email: adminUser?.email ?? null,
          admin_user_id: adminUser?.id ?? null,
        };
      }),
    );

    return results;
  }

  async getTenant(id: string) {
    const tenant = await this.tenantsService.findById(id);
    const userCount = await this.userRepository.count({
      where: { tenant_id: id, is_deleted: false },
    });
    const srCount = await this.serviceRequestRepository.count({
      where: { tenant_id: id, is_deleted: false },
    });
    return { ...tenant.toJSON(), user_count: userCount, service_request_count: srCount };
  }

  async getTenantOverview(id: string) {
    const tenant = await this.tenantsService.findById(id);
    const adminUser = await this.userRepository.findOne({
      where: { tenant_id: id, is_deleted: false, is_active: true },
      attributes: ['email', 'first_name', 'last_name'],
      order: [['created_at', 'ASC']],
    });

    const [userCount, srCount, woCount, invoiceCount] = await Promise.all([
      this.userRepository.count({ where: { tenant_id: id, is_deleted: false } }),
      this.serviceRequestRepository.count({ where: { tenant_id: id, is_deleted: false } }),
      this.workOrderRepository.count({ where: { tenant_id: id, is_deleted: false } }),
      this.invoiceRepository.count({ where: { tenant_id: id, is_deleted: false } }),
    ]);

    return {
      ...tenant.toJSON(),
      admin_email: adminUser?.email ?? null,
      admin_name: adminUser ? `${adminUser.first_name} ${adminUser.last_name}` : null,
      user_count: userCount,
      service_request_count: srCount,
      work_order_count: woCount,
      invoice_count: invoiceCount,
    };
  }

  async suspendTenant(id: string) {
    const tenant = await this.tenantsService.findById(id);
    await tenant.update({ is_active: false });
    return tenant;
  }

  async activateTenant(id: string) {
    const tenant = await this.tenantsService.findById(id);
    await tenant.update({ is_active: true });
    return tenant;
  }

  async getPlatformHealth() {
    const [totalTenants, activeTenants, totalUsers, totalServiceRequests] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { is_active: true } }),
      this.userRepository.count({ where: { is_deleted: false } }),
      this.serviceRequestRepository.count({ where: { is_deleted: false } }),
    ]);

    return {
      tenants: { total: totalTenants, active: activeTenants, suspended: totalTenants - activeTenants },
      users: { total: totalUsers },
      service_requests: { total: totalServiceRequests },
      timestamp: new Date().toISOString(),
    };
  }

  async updateProfile(userId: string, dto: { first_name?: string; last_name?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId, is_deleted: false } });
    if (!user) throw new NotFoundException('User not found');
    await user.update(dto);
    const { password_hash, password_reset_token, password_reset_expires, ...result } = user.toJSON() as any;
    return result;
  }

  async changeSuperAdminEmail(userId: string, currentPassword: string, newEmail: string) {
    const user = await this.userRepository.findOne({ where: { id: userId, is_deleted: false } });
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) throw new UnauthorizedException('Current password is incorrect');

    const existing = await this.userRepository.findOne({ where: { email: newEmail, is_deleted: false } });
    if (existing && existing.id !== userId) throw new ConflictException('Email address is already in use');

    await user.update({ email: newEmail });
    return { email: newEmail };
  }
}
