import {
  Controller, Post, Param, Body, Headers,
  UseGuards, HttpCode, UnauthorizedException, Logger,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { BitrixService } from './bitrix.service'

@Controller('bitrix')
export class BitrixController {
  private readonly logger = new Logger(BitrixController.name)

  constructor(private readonly bitrixService: BitrixService) {}

  @Post('import')
  @UseGuards(AuthGuard('jwt'))
  import() {
    return this.bitrixService.importTasks()
  }

  @Post('export/:taskId')
  @UseGuards(AuthGuard('jwt'))
  export(@Param('taskId') taskId: string) {
    return this.bitrixService.exportTask(taskId)
  }

  /**
   * Endpoint chamado pelo Bitrix24 automaticamente.
   * Não usa JWT (chamada vem do servidor externo).
   * Valida via header x-bitrix-secret ou query param ?secret=
   */
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Body() body: any,
    @Headers('x-bitrix-secret') headerSecret: string = '',
  ) {
    // O Bitrix24 também pode mandar o secret como campo no body (auth[secret])
    const bodySecret = body?.auth?.secret || ''
    const secret = headerSecret || bodySecret

    if (!this.bitrixService.validateSecret(secret)) {
      this.logger.warn('Webhook recusado: secret inválido')
      throw new UnauthorizedException('Secret inválido')
    }

    return this.bitrixService.receiveWebhook(body)
  }
}
