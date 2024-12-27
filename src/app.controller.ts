import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Quiz } from './app.interface';

@Controller('front-end-quiz')
export class AppController {
  constructor(private readonly appService: AppService) {}
  private readonly logger = new Logger(AppController.name);

  @Get('connect')
  async checkConnection(): Promise<void> {
    try {
      const client = this.appService.getClient();
      await client.db('admin').command({ ping: 1 });
      this.logger.log(
        'Pinged your deployment. You successfully connected to MongoDB!',
      );
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw new HttpException(
        'Failed to connect to MongoDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('data')
  async getData() {
    try {
      return await this.appService.getData();
    } catch (error) {
      this.logger.error('Failed to get data', error);
      throw new HttpException(
        'Failed to get data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('data/:id')
  async getDataById(@Param('id') id: string) {
    try {
      return await this.appService.getDataById(id);
    } catch (error) {
      this.logger.error(`Failed to get data by id: ${id}`, error);
      throw new HttpException(
        'Failed to get data by id',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('insert')
  async insertData(@Body() data: Quiz) {
    try {
      return await this.appService.insertData(data);
    } catch (error) {
      this.logger.error('Failed to insert data', error);
      throw new HttpException(
        'Failed to insert data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('insert-all')
  async insertAllData(@Body() data: Quiz[]) {
    try {
      return await this.appService.insertAllData(data);
    } catch (error) {
      this.logger.error('Failed to insert all data', error);
      throw new HttpException(
        'Failed to insert all data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('delete/:id')
  async deleteData(@Param('id') id: string): Promise<void> {
    try {
      await this.appService.deleteData(id);
    } catch (error) {
      this.logger.error(`Failed to delete data by id: ${id}`, error);
      throw new HttpException(
        'Failed to delete data by id',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('delete-all')
  async deleteAllData(): Promise<void> {
    try {
      await this.appService.deleteAllData();
    } catch (error) {
      this.logger.error('Failed to delete all data', error);
      throw new HttpException(
        'Failed to delete all data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
