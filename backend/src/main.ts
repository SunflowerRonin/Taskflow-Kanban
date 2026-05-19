import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })
  await app.listen(3001)
  console.log('Backend rodando em http://localhost:3001')
}
bootstrap()
