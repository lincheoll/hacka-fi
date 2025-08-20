import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if user is admin
    // This should be implemented based on your admin verification logic
    // For now, we'll use a simple check - you should replace this with proper admin verification
    return this.isAdmin(user.walletAddress);
  }

  private isAdmin(walletAddress: string): boolean {
    // TODO: Implement proper admin verification
    // This could check against a database of admin addresses,
    // or use a smart contract to verify admin status

    // For now, using environment variable for demo purposes
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
    return adminAddresses.includes(walletAddress.toLowerCase());
  }
}
