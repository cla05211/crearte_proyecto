import { Module } from '@nestjs/common';
import { WatsappService } from './watsapp.service';

@Module({
    providers:[WatsappService],
    exports:[WatsappService]
})
export class WatsappModule {}
