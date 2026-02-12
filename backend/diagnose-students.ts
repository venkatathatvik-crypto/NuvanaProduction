
// import { PrismaClient } from './generated/prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('--- Student Contact Diagnostic ---');
//   const students = await prisma.student_details.findMany({
//     select: {
//       profile_id: true,
//       parent_contact: true,
//       profiles: {
//         select: {
//           name: true,
//         }
//       }
//     }
//   });

//   console.log(`Found ${students.length} students.`);
//   students.forEach(s => {
//     console.log(`Student: ${s.profiles?.name}, ID: ${s.profile_id}, Contact: ${s.parent_contact || 'MISSING'}`);
//   });
// }

// main()
//   .catch(e => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
