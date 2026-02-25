import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../../../data-source';
import { Permission } from 'src/entities/permission.entity';
import { Role } from 'src/entities/role.entity';
import { User } from 'src/entities/user.entity';
dotenv.config();

const PERMISSIONS = [
  {
    name: 'all:manage',
    action: 'manage',
    subject: 'all',
    description: 'Full access',
  },
  {
    name: 'user:create',
    action: 'create',
    subject: 'User',
    description: 'Create users',
  },
  {
    name: 'user:read',
    action: 'read',
    subject: 'User',
    description: 'Read users',
  },
  {
    name: 'user:update',
    action: 'update',
    subject: 'User',
    description: 'Update users',
  },
  {
    name: 'user:delete',
    action: 'delete',
    subject: 'User',
    description: 'Delete users',
  },
];

async function seed(ds: DataSource): Promise<void> {
  const permissionRepo = ds.getRepository(Permission);
  const roleRepo = ds.getRepository(Role);
  const userRepo = ds.getRepository(User);

  // Upsert permissions
  const savedPermissions: Permission[] = [];
  for (const p of PERMISSIONS) {
    let perm = await permissionRepo.findOne({ where: { name: p.name } });
    if (!perm) {
      perm = permissionRepo.create(p);
      perm = await permissionRepo.save(perm);
    }
    savedPermissions.push(perm);
  }

  // Create admin role
  let adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    adminRole = roleRepo.create({
      name: 'admin',
      description: 'System administrator',
      permissions: savedPermissions,
    });
    adminRole = await roleRepo.save(adminRole);
  }

  // Create super-admin user
  const adminEmail = 'admin@notion-demo.com';
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    const hashedPw = await bcrypt.hash('Admin@123456', 12);
    admin = userRepo.create({
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPw,
      isEmailVerified: true,
      roles: [adminRole],
    });
    await userRepo.save(admin);
    console.log('✅ Admin user created: admin@notion-demo.com / Admin@123456');
  }

  console.log('✅ Seed completed');
}

dataSource
  .initialize()
  .then(seed)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
