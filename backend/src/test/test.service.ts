import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TestService {

  constructor(private prisma:PrismaService){}
 
  findAll() {
    return this.prisma.user_roles.findMany();
  }

}
