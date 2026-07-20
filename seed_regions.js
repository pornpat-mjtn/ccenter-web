const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const days = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์']
  const regions = ['ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้']

  for (const region of regions) {
    for (const day of days) {
      const name = `(${region}) ${day}`
      
      // Check if exists
      const exists = await prisma.staff.findUnique({
        where: { name }
      })

      if (!exists) {
        await prisma.staff.create({
          data: {
            name,
            region,
            startTime: '',
            carPlate: ''
          }
        })
        console.log(`Created: ${name}`)
      } else {
        console.log(`Already exists: ${name}`)
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
